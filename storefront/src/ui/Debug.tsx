import { Link, Route, Routes, useParams } from "react-router-dom";

import { getClientUrl } from "../config";
const clientUrl = getClientUrl();

const StoreFront = () => {
  return (
    <div>
      <h2>Debug page</h2>

      <ul>
        <li>
          <Link to=".">Admin</Link>
        </li>
        <li>
          <Link to="page1">Page1</Link>
        </li>
        <li>
          <Link to="snippet">Snippet</Link>
        </li>
      </ul>

      <Routes>
        <Route path="snippet" element={<ClientSnippet />} />
        <Route path=":subpage" element={<AdminSubpage />} />
        <Route path="/" element={<h3>Please select subpage.</h3>} />
      </Routes>
    </div>
  );
};

export default StoreFront;

const snippet = () => {
  return `<script src="${clientUrl}/loader.js"></script>
<script>
  window.Fogbender && Fogbender({
    rootEl, url, token
  });
</script>`;
};

const ClientSnippet = () => {
  return (
    <div>
      <h3 className="m-3 text-center text-2xl">
        How to add a Fogbender code snippet to your website
      </h3>
      <div className="w-full text-center">
        <textarea
          wrap="off"
          readOnly={true}
          className="mx-auto h-48 w-5/6 border border-black border-gray-600 p-2 font-mono"
          onClick={e => {
            if (document.getSelection()?.toString()) {
              // to allow to easily select part of snippet
              return;
            }
            // https://www.w3schools.com/howto/howto_js_copy_clipboard.asp
            const el = e.target as HTMLTextAreaElement;
            el.select();
            el.setSelectionRange(0, 99999);
            console.error('Uncomment - document.execCommand("copy");');
            // document.execCommand("copy");
          }}
          value={snippet()}
        />
      </div>
    </div>
  );
};

const AdminSubpage = () => {
  const { subpage } = useParams();
  return <h3>Subpage: {subpage}</h3>;
};
