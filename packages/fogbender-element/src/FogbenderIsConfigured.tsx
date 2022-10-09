import { noShadowDOM } from "component-register";
import { customElement } from "solid-element";
import { JSX, from, createResource, createMemo } from "solid-js";
import { consumeFogbender } from "./FogbenderProvider";

interface FogbenderIsConfiguredProps {}

customElement<FogbenderIsConfiguredProps>("fogbender-is-configured", {}, (props, { element }) => {
  noShadowDOM();

  const fogbender = consumeFogbender(element);

  const [data] = createResource(fogbender.isClientConfigured);
  const accessor = createMemo(() => (data.state === "ready" ? from(data()) : () => false));
  const isConfigured = createMemo(() => accessor()());

  function mapTemplates(templates: NodeListOf<Element>) {
    // compare that to https://github.com/11ty/is-land/blob/589b1219b0786cd325d9433ef063cd8662666b36/is-land.js#L151
    return Array.from(templates).map(template => {
      if (template instanceof HTMLTemplateElement) {
        return template.content.cloneNode(true);
      }
    });
  }

  const el = element.renderRoot;

  const children = createMemo(() =>
    isConfigured() ? (
      <div>{mapTemplates(el.querySelectorAll(`:scope template[data-is-configured]`))}</div>
    ) : (
      <div>{mapTemplates(el.querySelectorAll(`:scope template[data-is-not-configured]`))}</div>
    )
  );

  // it will not work without memo and fragment return
  return [children];
});
