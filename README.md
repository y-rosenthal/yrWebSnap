# Take "snapshots" of web pages

This is a Chrome Plugin that saves an HTML file that captures the current 
look of any webpage you are viewing.

The chrome extension strips out all <script> tags from the code in order to 
remove any "dynamic elements" from the page. In theory, this should save the webpage 
in exactly the form you are seeing it when you choose to "yrWebSnap" the page.

# TODO

The inspiration for this was to capture the contents of a AI conversation, for 
example with ChatGPT or Claude.ai or any other LLM. However, this is also useful
for capturing any other type of webpage too. The current version of this code
was created by using claude.ai to code the page. There were some bugs when taking
snapshots of claude.ai's converstaions which necessitated some special case
processing for claude.ai. I thiink this entire code could be simplified by
just stripping out the <script> tags from the DOM before saving the DOM. 
However, that has not been done yet. I plan to try to make a new version of 
this when I get a chance.
