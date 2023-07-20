import { AuthOptions } from "@aws-amplify/auth/lib-esm/types/Auth";
import Amplify from "aws-amplify";
// @ts-ignore
import { withAuthenticator } from "aws-amplify-react-native";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { FogbenderProvider } from "./context/fogbender";
import useCachedResources from "./hooks/useCachedResources";
import useColorScheme from "./hooks/useColorScheme";
import Navigation from "./navigation";

const isStaging = !!1;

const authConfig: AuthOptions = isStaging
  ? {
      userPoolId: "us-east-1_Mkgm43eko",
      userPoolWebClientId: "4j1d420ld73hnoeu8oc186daa6",
    }
  : {
      userPoolId: "us-west-1_qZyr62u9e",
      userPoolWebClientId: "3a681nuu5reah56mn0dahl94i1",
    };

Amplify.configure({
  Auth: authConfig,
});

function FogbenderApp() {
  const colorScheme = useColorScheme();
  return (
    <SafeAreaProvider>
      <Navigation colorScheme={colorScheme} />
      <StatusBar />
    </SafeAreaProvider>
  );
}

function App() {
  const isLoadingComplete = useCachedResources();

  if (!isLoadingComplete) {
    return null;
  } else {
    return (
      <FogbenderProvider>
        <FogbenderApp />
      </FogbenderProvider>
    );
  }
}

export default withAuthenticator(App);
