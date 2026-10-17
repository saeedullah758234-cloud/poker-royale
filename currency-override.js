(function() {
    'use strict';

    const replacements = [
        [/PKR\s*/gi, '$'],
        [/Rs\.?\s*/gi, '$'],
        [/₨\s*/g, '$'],
        [/Lahore, Pakistan/gi, 'United States'],
        [/Pakistan/gi, 'United States'],
        [/EasyPaisa/gi, 'PayPal'],
        [/JazzCash/gi, 'Cash App']
    ];

    function replaceTextInNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            let val = node.nodeValue;
            let original = val;
            replacements.forEach(([regex, sub]) => {
                val = val.replace(regex, sub);
            });
            if (val !== original) {
                node.nodeValue = val;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && node.tagName !== 'INPUT') {
            node.childNodes.forEach(replaceTextInNode);
        }
    }

    function runOverride() {
        if (document.body) {
            replaceTextInNode(document.body);
        }
    }

    document.addEventListener('DOMContentLoaded', runOverride);
    window.addEventListener('load', runOverride);

    // Observe dynamic changes
    const observer = new MutationObserver(() => {
        runOverride();
    });

    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
})();