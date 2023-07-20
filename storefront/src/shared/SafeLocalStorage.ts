export const SafeLocalStorage = {
  getItem: (key: string) => {
    let item = null;
    try {
      item = localStorage.getItem(key);
    } catch (e) {
      // console.log(e);
    }
    return item;
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // console.log(e);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // console.log(e);
    }
  },
};
