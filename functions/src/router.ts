/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable max-len */
/* eslint-disable new-cap */
import express from "express";
import admin from "firebase-admin";
import * as functions from "firebase-functions";
import base64url from "base64url";

admin.initializeApp();
const router = express.Router();

import {
  // Registration
  generateRegistrationOptions,
  verifyRegistrationResponse,
  // Authentication
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";

import type {
  RegistrationCredentialJSON,
  AuthenticationCredentialJSON,
  AuthenticatorDevice,
} from "@simplewebauthn/typescript-types";

interface LoggedInUser {
  id: string;
  username: string;
  devices: AuthenticatorDevice[];
  currentChallenge?: string;
}

// eslint-disable-next-line require-jsdoc
async function getUserFromFireStore(
    userId: string,
    rpId: string
): Promise<LoggedInUser> {
  const userRef = admin.firestore().collection("users").doc(userId);
  return await userRef.get().then((userDoc) => {
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      return {
        id: userData.id!,
        username: userData.username!,
        devices: userData.devices.map((dev: AuthenticatorDevice) => ({
          credentialPublicKey: dev.credentialPublicKey,
          credentialID: dev.credentialID,
          counter: dev.counter,
          transports: dev.transports,
        })),
        currentChallenge: userData.currentChallenge!,
      };
    } else {
      return {
        id: userId,
        username: `${userId}@${rpId}`,
        devices: [],
        currentChallenge: undefined,
      };
    }
  });
}

/**
 * Registration (a.k.a. "Registration")
 */
router.get("/generate-registration-options", async (req, res) => {
  let userId: string;
  let attestationType: AttestationConveyancePreference;
  let userVerification: UserVerificationRequirement;
  let residentKey: ResidentKeyRequirement;
  let authenticatorAttachment: AuthenticatorAttachment;

  if (req.query.userId) {
    userId = req.query.userId as string;
    attestationType = req.query
        .attestationType as AttestationConveyancePreference;
    userVerification = req.query
        .userVerification as UserVerificationRequirement;
    residentKey = req.query.residentKey as ResidentKeyRequirement;
    authenticatorAttachment = req.query.authenticatorAttachment as AuthenticatorAttachment;
  } else {
    throw Error("Request userId is unset");
  }

  if (req.headers.origin == null) {
    throw Error("Request origin is unset");
  }

  const originUrl = new URL(req.headers.origin);
  const rpId = originUrl.hostname;
  const user: LoggedInUser = await getUserFromFireStore(userId, rpId);

  functions.logger.log("generate-registration-options: user", user);

  const {
    /**
     * The username can be a human-readable name, email, etc... as it is intended only for display.
     */
    username,
    devices,
  } = user;

  const opts: GenerateRegistrationOptionsOpts = {
    rpName: "SimpleWebAuthn Example",
    rpID: rpId,
    userID: userId,
    userName: username,
    timeout: 60000,
    attestationType: attestationType,
    /**
     * Passing in a user's list of already-registered authenticator IDs here prevents users from
     * registering the same device multiple times. The authenticator will simply throw an error in
     * the browser if it's asked to perform registration when one of these ID's already resides
     * on it.
     */
    excludeCredentials: devices.map((dev) => ({
      id: dev.credentialID,
      type: "public-key",
      transports: dev.transports,
    })),
    /**
     * The optional authenticatorSelection property allows for specifying more constraints around
     * the types of authenticators that users to can use for registration
     */
    authenticatorSelection: {
      userVerification: userVerification,
      residentKey: residentKey,
    },
    /**
     * Support the two most common algorithms: ES256, and RS256
     */
    supportedAlgorithmIDs: [-7, -257],
  };

  if (
    authenticatorAttachment == "platform" ||
    authenticatorAttachment == "cross-platform"
  ) {
    opts.authenticatorSelection!.authenticatorAttachment =
      authenticatorAttachment;
  }

  const options = generateRegistrationOptions(opts);

  // /**
  //  * The server needs to temporarily remember this value for verification, so don't lose it until
  //  * after you verify an authenticator response.
  //  */
  const userRef = admin.firestore().collection("users").doc(userId);
  await userRef.set(
      {
        id: user.id,
        username: user.username,
        devices: user.devices,
        currentChallenge: options.challenge,
      },
      {merge: true}
  );

  res.send(options);
});

router.post("/verify-registration", async (req, res) => {
  try {
    const regCred: RegistrationCredentialJSON = req.body.credential;

    if (req.headers.origin == null) {
      throw Error("Request origin is unset");
    }

    const originUrl = new URL(req.headers.origin);
    const rpId: string = originUrl.hostname;
    const userId: string = req.body.userId;
    const user: LoggedInUser = await getUserFromFireStore(userId, rpId);
    functions.logger.log("verify-registration: user", user);

    const expectedChallenge = user.currentChallenge;

    const opts: VerifyRegistrationResponseOpts = {
      credential: regCred,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin: originUrl.origin,
      expectedRPID: rpId,
      requireUserVerification: true,
    };

    const verification: VerifiedRegistrationResponse =
      await verifyRegistrationResponse(opts);

    const {verified, registrationInfo} = verification;

    if (verified && registrationInfo) {
      const {credentialPublicKey, credentialID, counter} = registrationInfo;

      const existingDevice = user.devices.find((device) =>
        device.credentialID.equals(credentialID)
      );

      if (!existingDevice) {
        /**
         * Add the returned device to the user's list of devices
         */
        const newDevice: AuthenticatorDevice = {
          credentialPublicKey,
          credentialID,
          counter,
          transports: regCred.transports,
        };
        user.devices.push(newDevice);

        const userRef = admin.firestore().collection("users").doc(userId);
        await userRef.set({devices: user.devices}, {merge: true});
      }
    }
    res.send({verified});
  } catch (error) {
    const _error = error as Error;
    functions.logger.error(_error);
    res.status(400).send({error: _error.message});
  }
});

router.get("/generate-authentication-options", async (req, res) => {
  let userId = "";
  let opts: GenerateAuthenticationOptionsOpts;

  if (req.headers.origin == null) {
    throw Error("Request origin is unset");
  }

  const userVerification = req.query.userVerification as UserVerificationRequirement;
  const originUrl = new URL(req.headers.origin);
  const rpId = originUrl.hostname;

  if (req.query.userId) {
    userId = req.query.userId as string;
    const user: LoggedInUser = await getUserFromFireStore(userId, rpId);
    functions.logger.log("generate-authentication-options: user", user);
    opts = {
      timeout: 60000,
      allowCredentials: user.devices.map((dev) => ({
        id: dev.credentialID,
        type: "public-key",
        transports: dev.transports,
      })),
      userVerification: userVerification,
      rpID: rpId,
    };
  } else {
    functions.logger.log("generate-authentication-options for autofill");
    opts = {
      timeout: 60000,
      allowCredentials: [],
      userVerification: userVerification,
      rpID: rpId,
    };
  }

  const options = generateAuthenticationOptions(opts);

  /**
   * The server needs to temporarily remember this value for verification, so don't lose it until
   * after you verify an authenticator response.
   */
  if (userId) {
    const userRef = admin.firestore().collection("users").doc(userId);
    await userRef.set({currentChallenge: options.challenge}, {merge: true});
  }
  res.send(options);
});

router.post("/verify-authentication", async (req, res) => {
  try {
    const authCred: AuthenticationCredentialJSON = req.body.credential;

    if (req.headers.origin == null) {
      throw Error("Request origin is unset");
    }

    const originUrl = new URL(req.headers.origin);
    const rpId: string = originUrl.hostname;
    const userId: string = req.body.userId;
    const user: LoggedInUser = await getUserFromFireStore(userId, rpId);

    functions.logger.log("verify-authentication: user", user);

    const expectedChallenge = user.currentChallenge;

    let dbAuthenticator;
    const bodyCredIDBuffer = base64url.toBuffer(authCred.rawId);
    // "Query the DB" here for an authenticator matching `credentialID`
    for (const dev of user.devices) {
      if (dev.credentialID.equals(bodyCredIDBuffer)) {
        dbAuthenticator = dev;
        break;
      }
    }

    if (!dbAuthenticator) {
      throw Error("Authenticator is not registered with this site");
    }

    const opts: VerifyAuthenticationResponseOpts = {
      credential: authCred,
      expectedChallenge: `${expectedChallenge}`,
      expectedOrigin: originUrl.origin,
      expectedRPID: rpId,
      authenticator: dbAuthenticator,
      requireUserVerification: true,
    };
    const verification: VerifiedAuthenticationResponse =
      await verifyAuthenticationResponse(opts);
    const {verified, authenticationInfo} = verification;

    if (verified) {
      // Update the authenticator's counter in the DB to the newest count in the authentication
      dbAuthenticator.counter = authenticationInfo.newCounter;
    }
    res.send({verified});
  } catch (error) {
    const _error = error as Error;
    functions.logger.error(_error);
    res.status(400).send({error: _error.message});
  }
});

export default router;
