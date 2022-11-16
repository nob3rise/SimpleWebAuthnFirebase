<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" sm="12" md="12" align="center">
        <p class="text-center text-h3">SimpleWebAuthn Firebase</p>
      </v-col>
    </v-row>
    <v-row justify="center">
      <v-col cols="12" sm="10" md="8" align="center">
        <v-card class="mx-auto pa-2">
          <v-card-text>
            <div class="red--text text-h4">{{ messageCheck }}</div>
          </v-card-text>
          <v-row justify="center">
            <v-col cols="6" sm="5" md="4" align="center">
              <v-text-field
                v-model="userName"
                label="User ID"
                type="text"
                clearable
                name="username"
                autocomplete="webauthn"
              ></v-text-field>
            </v-col>
            <v-col cols="6" sm="5" md="4" align="center">
              <v-text-field
                v-model="password"
                label="Password"
                type="password"
                clearable
                name="password"
                autocomplete="current-password webauthn"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row justify="center">
            <v-col cols="4" sm="4" md="4">
              <v-combobox
                label="attestationType"
                v-model="selectAttestationType"
                :items="itemAttestationType"
                dense
                outlined
              ></v-combobox>
              <v-combobox
                label="userVerification"
                v-model="selectUserVerification"
                :items="itemUserVerification"
                dense
                outlined
              ></v-combobox>
            </v-col>
            <v-col cols="4" sm="4" md="4">
              <v-combobox
                label="residentKey"
                v-model="selectResidentKey"
                :items="itemResidentKey"
                dense
                outlined
              ></v-combobox>
              <v-combobox
                label="authenticatorAttachment"
                v-model="selectAuthenticatorAttachment"
                :items="itemAuthenticatorAttachment"
                dense
                outlined
              ></v-combobox>
            </v-col>
          </v-row>
          <v-row justify="center">
            <v-btn
              color="primary"
              class="ma-2"
              min-width="180"
              @click="register()"
              :disabled="userName ? false : true"
            >
              <v-icon right dark class="ma-2"> mdi-account-plus </v-icon>
              Regisger
            </v-btn>
            <v-btn
              color="primary"
              class="ma-2"
              min-width="180"
              @click="authenticate(false)"
              :disabled="userName ? false : true"
            >
              <v-icon right dark class="ma-2"> mdi-account-key </v-icon>
              Authenticate
            </v-btn>
          </v-row>
          <v-row justify="center">
            <div :class="messageStatusClass" v-if="messageStatus">
              {{ messageStatus }}
            </div>
          </v-row>
          <v-row>
            <div class="text-center text-h6">
              <v-icon
                right
                dark
                @click="showConsole = !showConsole"
                v-if="showConsole"
              >
                mdi-chevron-down-circle-outline
              </v-icon>
              <v-icon right dark @click="showConsole = !showConsole" v-else>
                mdi-chevron-up-circle-outline
              </v-icon>
              Console
            </div>
          </v-row>
          <v-row>
            <v-textarea
              v-if="showConsole"
              outlined
              :value="messageConsole"
              rows="20"
            ></v-textarea>
          </v-row>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthnAutofill,
} from "@simplewebauthn/browser";
import { FALSE } from "node-sass";
import Vue from "vue";

export default Vue.extend({
  name: "IndexPage",
  data() {
    return {
      itemAttestationType: ["direct", "none"],
      itemUserVerification: ["required", "preferred", "discouraged"],
      itemResidentKey: ["required", "preferred", "discouraged"],
      itemAuthenticatorAttachment: ["all", "platform", "cross-platform"],
      selectAttestationType: "direct",
      selectUserVerification: "required",
      selectResidentKey: "required",
      selectAuthenticatorAttachment: "all",
      userName: "",
      password: "",
      showConsole: true,
      messageConsole: "",
      messageStatus: "",
      messageStatusClass: "ma-2 text-h6",
      messageCheck: "",
    };
  },
  mounted: async function () {
    try {
      if (!this.$store.state.user) {
        await this.$fire.auth.signInAnonymously()
          .catch((error) => {
            console.log(error);
          });
      } else {
        console.log("sessionId:", this.$store.state.user);
      }
      
      if (
        await browserSupportsWebAuthnAutofill()
      ) {
        console.log("conditional UI is available");
        this.authenticate(true);
      } else {
        console.log("conditional UI is not available");
      }

      if (window.PublicKeyCredential) {
        if (
          await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        ) {
          this.messageCheck = "PlatformAuthenticator is available";
        } else {
          this.messageCheck = "PlatformAuthenticator is not available";
        }
      } else {
        this.messageCheck = "window.PublicKeyCredntial is not defined";
        return;
      }
    } catch (err) {
      this.messageCheck = err as string;
    }
  },

  methods: {
    async register() {
      console.log("register", this);

      try {
        const opts = await this.$axios.$get(
          `${process.env.CLOUD_FUNCTION_URL}/generate-registration-options` +
            `?userName=${this.userName}` +
            `&sessionId=${this.$store.state.user.uid}` +
            `&attestationType=${this.selectAttestationType}` +
            `&userVerification=${this.selectUserVerification}` +
            `&residentKey=${this.selectResidentKey}` +
            `&authenticatorAttachment=${this.selectAuthenticatorAttachment}`
        );

        // Require a resident key for this demo
        // opts.authenticatorSelection.residentKey = "required";
        // opts.authenticatorSelection.requireResidentKey = true;
        opts.extensions = {
          credProps: true,
        };

        // console.log("opts", opts);
        this.messageConsole =
          "// Registration Options\n" + `${JSON.stringify(opts, null, 2)}\n`;

        const regCred = await startRegistration(opts);
        // console.log("regCred", regCred);
        this.messageConsole =
          this.messageConsole +
          "// Registration Response\n" +
          `${JSON.stringify(regCred, null, 2)}\n`;

        const verificationResp = await this.$axios.$post(
          `${process.env.CLOUD_FUNCTION_URL}/verify-registration`,
          JSON.stringify({ credential: regCred, userName: this.userName, sessionId:this.$store.state.user.uid }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // console.log("verificationResp", verificationResp);

        if (verificationResp.verified) {
          this.messageStatus = "Authenticator registered!";
          this.messageStatusClass += " green--text";
        } else {
          this.messageStatus = "Oh no, something went wrong!";
          this.messageStatusClass += " red--text";
        }
      } catch (error) {
        console.log(error);
      }
    },
    async authenticate(useBrowserAutofill: boolean) {
      console.log("authenticate");

      try {
        let uri = `${process.env.CLOUD_FUNCTION_URL}/generate-authentication-options` +
          `?sessionId=${this.$store.state.user.uid}` +
          `&attestationType=${this.selectAttestationType}` +
          `&userVerification=${this.selectUserVerification}` +
          `&residentKey=${this.selectResidentKey}` +
          `&authenticatorAttachment=${this.selectAuthenticatorAttachment}`;
        uri += useBrowserAutofill ? '' : `&userName=${this.userName}`;
        const opts = await this.$axios.$get(uri);
        console.log(opts);

        // console.log("opts", opts);
        this.messageConsole =
          "// Authentication Options\n" + `${JSON.stringify(opts, null, 2)}\n`;

        const authCred = await startAuthentication(opts, useBrowserAutofill);
        // console.log("authCred", authCred);
        this.messageConsole =
          this.messageConsole +
          "// Authentication Response\n" +
          `${JSON.stringify(authCred, null, 2)}\n`;

        const verificationResp = await this.$axios.$post(
          `${process.env.CLOUD_FUNCTION_URL}/verify-authentication`,
          JSON.stringify({ credential: authCred, userName: authCred.response.userHandle!, sessionId: this.$store.state.user.uid }),
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // console.log("verificationResp", verificationResp);
        if (verificationResp.verified) {
          this.messageStatus = "User authenticated!";
          this.messageStatusClass += " green--text";
        } else {
          this.messageStatus = "Oh no, something went wrong!";
          this.messageStatusClass += " red--text";
        }
      } catch (error) {
        console.log(error);
      }
    },
  },
});
</script>