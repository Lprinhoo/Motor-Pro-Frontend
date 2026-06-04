const popupOverlay  = document.getElementById('popup-overlay');
const popupTitle    = document.getElementById('popup-title');
const popupMessage  = document.getElementById('popup-message');
const popupCloseBtn = document.getElementById('popup-close-btn');

export const showPopup = (title, message, isError = false) => {
    if (!popupOverlay || !popupTitle || !popupMessage || !popupCloseBtn) {
        console.error('Popup elements not found in the DOM.');
        return;
    }
    popupTitle.innerText   = title;
    popupMessage.innerText = message;
    popupTitle.style.color = isError ? '#FF4D4D' : '#16BC4E';
    popupCloseBtn.style.backgroundColor = isError ? '#FF4D4D' : '#16BC4E';
    popupOverlay.classList.remove('hidden');
};

export const hidePopup = () => {
    if (popupOverlay) {
        popupOverlay.classList.add('hidden');
    }
};

if (popupCloseBtn) {
    popupCloseBtn.addEventListener('click', hidePopup);
}
