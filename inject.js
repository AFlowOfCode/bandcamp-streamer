/**
 * injectScript - Inject internal script to allow access to the `window`
 *
 * @param  {type} file_path Local path of the internal script.
 * @param  {type} tag The tag as string, where the script will be append (default: 'body').
 * @see    {@link http://stackoverflow.com/questions/20499994/access-window-variable-from-content-script}
 */
function injectScript(file_path, tag) {
    const node = document.getElementsByTagName(tag)[0],
          script = document.createElement('script');
    script.setAttribute('type', 'module');
    script.setAttribute('src', file_path);
    node.appendChild(script);
}
injectScript(chrome.runtime.getURL('contentScript.js'), 'body');