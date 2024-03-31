const ACTION_NAME = "find-winner";

function disableManualScrolling() {
    document.body.style.overflow = "hidden";
}

function enableManualScrolling() {
    document.body.style.overflow = "auto";
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

function deleteSpinner() {
    const spinnerOverlay = document.getElementById("spinner-overlay");
    if (spinnerOverlay) {
        spinnerOverlay.remove();
    }
}

document.addEventListener("DOMContentLoaded", function () {
    var scrollButton = document.getElementById(ACTION_NAME);

    scrollButton.addEventListener("click", function () {
        window.close();
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

function getUniqueEntries(arr) {
    const entries = new Set();

    arr.forEach(element => {
        entries.add(element.querySelector('a[class*="StyledLink-StyledUserLinkName"]').href);
    });

    return entries;
}

function scrollToRandomComment(uniqueEntries) {
    const uniqueEntriesArray = Array.from(uniqueEntries);
    
    const randomIndex = Math.floor(Math.random() * uniqueEntriesArray.length);
    const randomUser = uniqueEntriesArray[randomIndex].split('/@')[1];
    const commentElement = document.querySelector(`a[href*="${randomUser}"]`);
    
    if (commentElement) {
        commentElement.parentElement.style.border = '2px solid #ff0066';
        commentElement.parentElement.style.borderRadius = '5px';

        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

let commentElements = getCommentElements(); // Initialize with initial comments

let currentHeight = document.body.scrollHeight;
let isDoneFetchingComments = false;

let consecutiveFalseCount = 0;
const MAX_CONSECUTIVE_FALSE = 10;

chrome.runtime.onMessage.addListener(async function (message) {
    if (message.action === ACTION_NAME) {
        disableManualScrolling();
        injectSpinner();

        while (!isDoneFetchingComments) {
            window.scrollTo(0, document.body.scrollHeight);

            await new Promise((resolve) => setTimeout(resolve, 1));

            if (skeletonElementExists()) {
                consecutiveFalseCount = 0;
            } else {
                consecutiveFalseCount++;

                if (consecutiveFalseCount >= MAX_CONSECUTIVE_FALSE) {
                    isDoneFetchingComments = true;

                    const uniqueEntries = getUniqueEntries(commentElements);
                    scrollToRandomComment(uniqueEntries);

                    enableManualScrolling();
                    deleteSpinner();
                }
            }

            const newHeight = document.body.scrollHeight;

            if (newHeight !== currentHeight) {
                commentElements = getCommentElements();
                currentHeight = newHeight;
            }
        }
    }
});
