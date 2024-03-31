const ACTION_NAME = "find-winner";


function disableManualScrolling() {
    document.body.style.overflow = 'hidden';
}

function enableManualScrolling() {
    document.body.style.overflow = 'auto';
}

const uuid = crypto.randomUUID();
// Function to inject the spinner HTML into the webpage
function injectSpinner() {
    var spinnerHtml = `
       <div id="spinner-overlay" style="display: block;">
            <div class="spinner"></div>
        </div>
        <style>
            #spinner-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.75);
                z-index: 9999;
                display: block;
            }
            .spinner {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 50px;
                height: 50px;
                border: 3px solid #f3f3f3;
                border-radius: 50%;
                border-top: 3px solid #3498db;
                width: 20px;
                height: 20px;
                -webkit-animation: spin 2s linear infinite;
                animation: spin 2s linear infinite;
            }
            @-webkit-keyframes spin {
                0% {
                    -webkit-transform: rotate(0deg);
                }
                100% {
                    -webkit-transform: rotate(360deg);
                }
            }
            @keyframes spin {
                0% {
                    transform: rotate(0deg);
                }
                100% {
                    transform: rotate(360deg);
                }
            }
        </style>
    `;

    var spinnerElement = document.createElement("div");
    spinnerElement.innerHTML = spinnerHtml;
    document.body.appendChild(spinnerElement);
}

document.addEventListener("DOMContentLoaded", function () {
    var scrollButton = document.getElementById(ACTION_NAME);

    scrollButton.addEventListener("click", function () {
        scrollButton.disabled = true;

        // Send message to content script to scroll the webpage
        chrome.tabs.query(
            { active: true, currentWindow: true },
            function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { action: ACTION_NAME });
            }
        );
    });
});

function getCommentElements() {
    return document.querySelectorAll(
        'div[class*="DivCommentContentContainer"]'
    );
}

// SkeletonContainer is a loading comment
function skeletonElementExists() {
    const res = document.querySelector(
        'div[class*="DivCommentItemSkeletonContainer"]'
    );
    return res !== null;
}

let commentElements = getCommentElements(); // Initialize with initial comments

let currentHeight = document.body.scrollHeight;
let isDoneFetchingComments = false;

let consecutiveFalseCount = 0;
const MAX_CONSECUTIVE_FALSE = 10;

chrome.runtime.onMessage.addListener(async function (
    message,
    sender,
    sendResponse
) {
    if (message.action === ACTION_NAME) {
        disableManualScrolling();
        injectSpinner();

        while (!isDoneFetchingComments) {
            // Scroll to the bottom of the webpage
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise((resolve) => setTimeout(resolve, 1));
            const newHeight = document.body.scrollHeight;

            if (skeletonElementExists()) {
                // If the skeleton element exists, reset the consecutive false count
                consecutiveFalseCount = 0;
            } else {
                consecutiveFalseCount++;

                // Check if consecutive false count has reached the threshold
                if (consecutiveFalseCount >= MAX_CONSECUTIVE_FALSE) {
                    isDoneFetchingComments = true;
                    console.log("Done fetching comments");
                    enableManualScrolling();
                }
            }

            if (newHeight !== currentHeight) {
                // Update comment elements if new comments are fetched
                commentElements = getCommentElements();
                currentHeight = newHeight;

                console.log(`Fetched ${commentElements.length} comments`);
            }
        }
    }
});
