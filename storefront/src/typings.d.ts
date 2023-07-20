declare module "react-type-animation" {
  import * as React from "react";
  interface TypeAnimation {
    cursor?: boolean;
    sequence?: (string | number)[];
    wrapper?: string;
    repeat?: number;
    className?: string | undefined;
  }
  const TypeAnimation: React.FC<TypeAnimation>;
  export default TypeAnimation;
}
