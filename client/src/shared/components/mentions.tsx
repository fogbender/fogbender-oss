/**
 * Extracts search string for text given current cursor position.
 *
 * Returns `undefined` if no match was found. Empty string if search
 * just started, and string without spaces otherwise.
 *
 * Examples:
 *
 * `extractSearchString("@", "@", 0)` returns `undefined`
 * `extractSearchString("@", "@", 1)` returns `""`
 * `extractSearchString("@", "@a", 1)` returns `""`
 * `extractSearchString("@", "@a", 2)` returns `"a"`
 * `extractSearchString("@", "@a ", 3)` returns `undefined`
 */
export const extractSearchString = (symbol: string, newValue: string, selectionStart: number) => {
  // string has to be at least 1 char (@) long
  if (selectionStart >= 1) {
    // find last @ in string before cursor
    const index = newValue.lastIndexOf(symbol, selectionStart - 1);
    if (index !== -1) {
      // check that is follows space or beginning of the string
      const prev: string | undefined = newValue[index - 1]; // undefined when index is negative
      const goodPrev = prev === undefined || prev.match(/\s/) !== null;
      if (goodPrev) {
        const searchString = newValue.substring(index + 1, selectionStart);
        // search can be either empty or without spaces
        const goodSearch = searchString === "" || searchString.match(/\s/) === null;
        if (goodSearch) {
          return searchString;
        }
      }
    }
  }
  return;
};

export const replaceSearchStringWithResult = (
  currentValue: string,
  symbol: string,
  searchResult: string,
  selectionStart: number
) => {
  const index = currentValue.lastIndexOf(symbol, selectionStart - 1);
  if (index !== -1) {
    const beforeSearch = currentValue.substring(0, index + 1); // includes symbol
    const afterSearch = currentValue.substring(selectionStart);
    const beforeCursor = beforeSearch + searchResult + " ";
    const newValue = beforeCursor + afterSearch;
    const newSelectionStart = beforeCursor.length;
    return { newValue, newSelectionStart };
  }
  // fallback to just inserting into the end
  const newValue = currentValue + symbol + searchResult + " ";
  const newSelectionStart = newValue.length;
  return { newValue, newSelectionStart };
};
