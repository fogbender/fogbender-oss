import { Buffer } from "buffer";
export const fileToBuffer = (file: File) => {
  if ("arrayBuffer" in file) {
    return file.arrayBuffer().then(x => Buffer.from(x));
  }
  return new Promise<Buffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = evt => {
      if (evt.target?.readyState === 2) {
        if (evt.target.error) {
          return reject(evt.target.error);
        }
        if (typeof evt.target.result === "object" && evt.target.result) {
          resolve(Buffer.from(evt.target.result));
        }
      }
      return reject(new Error("Error while reading file"));
    };
    reader.readAsArrayBuffer(file);
  });
};
