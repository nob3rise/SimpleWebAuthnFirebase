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
          <v-col cols="6" sm="5" md="4" align="center">
            <v-text-field
              v-model="userId"
              label="User ID"
              clearable
              name="username" autocomplete="webauthn"
            ></v-text-field>
          </v-col>
          <v-btn color="primary" class="ma-2" min-width="180" @click="register()" :disabled="userId ? false : true">
            <v-icon right dark class="ma-2"> mdi-account-plus </v-icon>
            Regisger
          </v-btn>
          <v-btn color="primary" class="ma-2" min-width="180" @click="authenticate()" :disabled="userId ? false : true">
            <v-icon right dark class="ma-2"> mdi-account-key </v-icon>
            Authenticate
          </v-btn>
          <div
            :class="messageStatusClass"
            v-if="messageStatus"
          >
            {{messageStatus}}
          </div>
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
          <v-textarea
            v-if="showConsole"
            outlined
            :value="messageConsole"
            rows="20"
          ></v-textarea>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import Vue from "vue";

export default Vue.extend({
  name: "IndexPage",
  data() {
    return {
      userId: "",
      showConsole: true,
      messageConsole: "",
      messageStatus: "",
      messageStatusClass: "ma-2 text-h6",
    };
  },
  methods: {
    async register() {
      console.log("register");

      try {
        const opts = await this.$axios.$get(
          `${process.env.CLOUD_FUNCTION_URL}/generate-registration-options?userId=${this.userId}`
        );

        // Require a resident key for this demo
        opts.authenticatorSelection.residentKey = "required";
        opts.authenticatorSelection.requireResidentKey = true;
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
          JSON.stringify({credential: regCred, userId: this.userId}),
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
    async authenticate() {
      console.log("authenticate");

      try {
        const opts = await this.$axios.$get(
          `${process.env.CLOUD_FUNCTION_URL}/generate-authentication-options?userId=${this.userId}`
        );
        // console.log("opts", opts);
        this.messageConsole =
          "// Authentication Options\n" + `${JSON.stringify(opts, null, 2)}\n`;

        const authCred = await startAuthentication(opts);
        // console.log("authCred", authCred);
        this.messageConsole =
          this.messageConsole +
          "// Authentication Response\n" +
          `${JSON.stringify(authCred, null, 2)}\n`;

        const verificationResp = await this.$axios.$post(
          `${process.env.CLOUD_FUNCTION_URL}/verify-authentication`,
          JSON.stringify({credential: authCred, userId: this.userId}),
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
