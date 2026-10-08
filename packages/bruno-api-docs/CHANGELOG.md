# @usebruno/api-docs

## 0.4.0

### Minor Changes

- de6ac34: Nested variables now resolve fully when Show vars is on (#67)
- a18eec3: Open in Bruno is shown for every collection; non-git collections get a download-and-import modal (#74)
- 9fcbb11: Prompt variables ({{?Name}}) in the playground ask the reader for a value before sending, using the same Input Required dialog as the Bruno app (#87)

### Patch Changes

- e7b1beb: fix(docs): matches Bruno app's markdown rendering (BRU-4228)
- 3f7b1e9: Bugfixes: 19. The folder and collection pages now have an Execution Context section, separate from the configuration section. Headers and auth stay under Folder Configuration and Collection Configuration; vars, script and tests move into Execution Context, which collapses and expands like the one on request pages. The environment switcher is hidden from the docs header when the collection has no environments.

  25. A long environment name is cut short with an ellipsis in the switcher and in its dropdown, and the full name shows in a tooltip when it is cut.

  26. Empty Post-Response variables now read "None." on the folder and collection pages, the same as on request pages, instead of the section disappearing.

  27. The playground folder settings Vars tab now has a Post Response table, like the Bruno app. Edits are saved with the folder.

  Also, when a collection has no environments, the playground switcher no longer opens a dropdown whose only entry repeats "No environments". It shows the text with no arrow.

- 93c4656: fix(docs): parity UI bugs 2
  16: On the gRPC request page, the URL bar now stays at the top while you scroll, like the other request pages.
  20: The "Show vars" switch now shows a tooltip.
  22: In the script editor's search box, the button tooltips no longer get cut off or flicker.
  27: In example cards, the scrollbar now only shows when you hover over the content.
  28: Letters like g, y and p are no longer cut off at the bottom in the collection name, variable card, environments page, table keys and search results.
  30: In search results, method names like POST and PATCH are shown in full instead of being cut off with "...".
  35: Tooltips now match the light and dark theme instead of being the opposite colour.
  36: Description tooltips now keep the line breaks and blank lines written in the Bruno app.
- 7631015: fix(docs):checkbox ident,color and table wrap
- eb9be7e: feat(docs): Parity UI bugs fixes
- 47c70a2: test(playground): cover bundled libraries in the quickjs sandbox
- 9151101: test(playground): cover remaining layout persistence cases
- 144f709: test(e2e): expand Playwright coverage for example code snippets
- e3dc567: test(e2e): expand Playwright coverage for the theme switcher
- b724760: What changed 18. Environment value fields. Multiline value fields grow to fit their content instead of scrolling inside a fixed box, and they re-fit when a column is dragged narrower. Table, card and secret variants now behave the same.

  21. Header name suggestions. The suggestions list renders in a portal, so the playground's scrollbar styling never reached it. It now uses the same thin themed scrollbar as the rest of the app.

  22. Request tabs across a dock change. Changing the dock placement swaps the dock component and remounts the request and response panes, which reset their tab to the default. Both panes now keep the selected tab in session storage, the lane the collapsible sections and dock sizes already use.

  23. Assertion descriptions. The Assertions tab was the only tab without a Description column, although the format and the desktop app both carry the field. It now shows and persists the description, and its column labels match the app (Expr, Value).

  24. First column alignment. The first column header now starts exactly where the cell text below it starts, with and without the enable checkbox. The query params table labels that column Name instead of Key, as the app does.

  25. Script error cards. When both the post-response and tests scripts failed, closing one error card closed both, and the cards took the panel's height from the content below them. Each card now closes on its own and the response body and test results keep their full height.

  Also in this PR
  KeyValueTable.css becomes an Emotion StyledWrapper, matching every other component in the package. The legacy .text-input rules are dropped because HighlightedInput already owns those fields.

- 708597e: fix(docs): the variables count shows the total count of selected values even if the name is not present
- 1b65052: fix(collection-docs): UI style fix
- a6bc138: fix(playground): request headers win over the Auth tab when both set the same header
