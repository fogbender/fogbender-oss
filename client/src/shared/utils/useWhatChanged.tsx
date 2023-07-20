import { setUseWhatChange, useWhatChanged as uwc } from "@simbathesailor/use-what-changed";

setUseWhatChange(import.meta.env.DEV);

// const App = () => {
//   useWhatChanged([token, user], "token,user");
//   ...
// };
export const useWhatChanged = uwc;
