// ============================================
// UNIVERSAL EVENT TRACKER
// Tracks all user interactions on any webpage
// ============================================

(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        scrollThrottle: 300,        // ms between scroll events
        mouseMoveThrottle: 500,     // ms between mouse move logs
        resizeThrottle: 500,        // ms between resize events
        idleTimeout: 30000,         // 30 seconds idle detection
        trackMouseMovement: true,
        trackKeyboard: true,
        trackClipboard: true,
        trackVisibility: true,
        visibilityThreshold: 0.5    // 50% visible to trigger view event
    };
    
    // State management
    const STATE = {
        eventCount: 0,
        sessionStart: new Date(),
        lastActivity: new Date(),
        observedElements: new Set(),
        scrollDepth: 0,
        maxScrollDepth: 0,
        timeOnPage: 0,
        isIdle: false,
        mouseTrail: []
    };
    
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    function getTimestamp() {
        return new Date().toISOString();
    }
    
    function getRelativeTime() {
        return Date.now() - STATE.sessionStart.getTime();
    }
    
    function getElementType(element) {
        if (!element || !element.tagName) return 'unknown';
        
        const tag = element.tagName.toLowerCase();
        const type = element.type ? element.type.toLowerCase() : '';
        const role = element.getAttribute('role');
        const contentEditable = element.contentEditable === 'true';
        
        // Detailed classification
        if (tag === 'button') return 'button';
        if (tag === 'a') return 'link';
        if (tag === 'img') return 'image';
        if (tag === 'video') return 'video';
        if (tag === 'audio') return 'audio';
        if (tag === 'canvas') return 'canvas';
        if (tag === 'svg') return 'svg';
        if (tag === 'select') return 'dropdown';
        if (tag === 'textarea') return 'textarea';
        if (contentEditable) return 'contenteditable';
        
        if (tag === 'input') {
            const inputTypes = {
                'checkbox': 'checkbox',
                'radio': 'radio',
                'submit': 'submit_button',
                'button': 'input_button',
                'file': 'file_upload',
                'range': 'slider',
                'color': 'color_picker',
                'date': 'date_picker',
                'time': 'time_picker',
                'search': 'search_input',
                'tel': 'phone_input',
                'url': 'url_input',
                'email': 'email_input',
                'number': 'number_input',
                'password': 'password_input'
            };
            return inputTypes[type] || 'text_input';
        }
        
        if (['h1','h2','h3','h4','h5','h6'].includes(tag)) return 'heading';
        if (tag === 'form') return 'form';
        if (tag === 'table') return 'table';
        if (tag === 'nav') return 'navigation';
        if (tag === 'iframe') return 'iframe';
        if (role) return `${tag}_${role}`;
        
        return tag;
    }
    
    function getElementIdentifier(element) {
        if (!element) return 'unknown';
        
        const id = element.id ? `#${element.id}` : '';
        const classes = element.className && typeof element.className === 'string' 
            ? `.${element.className.trim().split(/\s+/).join('.')}` 
            : '';
        const tag = element.tagName ? element.tagName.toLowerCase() : '';
        const name = element.name ? `[name="${element.name}"]` : '';
        const text = element.textContent 
            ? ` "${element.textContent.trim().substring(0, 40)}${element.textContent.length > 40 ? '...' : ''}"` 
            : '';
        
        // Get data attributes
        const dataAttrs = [];
        if (element.dataset) {
            for (let key in element.dataset) {
                dataAttrs.push(`[data-${key}="${element.dataset[key]}"]`);
            }
        }
        
        return `${tag}${id}${classes}${name}${dataAttrs.join('')}${text}`.trim() || 'unknown';
    }
    
    function getElementPath(element) {
        const path = [];
        let current = element;
        
        while (current && current !== document.body) {
            const tag = current.tagName.toLowerCase();
            const id = current.id ? `#${current.id}` : '';
            const cls = current.className && typeof current.className === 'string'
                ? `.${current.className.trim().split(/\s+/)[0]}`
                : '';
            path.unshift(`${tag}${id}${cls}`);
            current = current.parentElement;
        }
        
        return path.join(' > ');
    }
    
    function getPageMetadata() {
        return {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            screen: {
                width: window.screen.width,
                height: window.screen.height
            },
            userAgent: navigator.userAgent,
            language: navigator.language
        };
    }
    
    function getScrollInfo() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        const scrollPercentage = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100) || 0;
        
        return {
            scroll_x: window.pageXOffset || document.documentElement.scrollLeft,
            scroll_y: scrollTop,
            scroll_percentage: scrollPercentage,
            scroll_height: scrollHeight,
            viewport_height: clientHeight
        };
    }
    
    // ============================================
    // LOGGING FUNCTION
    // ============================================
    
    function logEvent(eventType, eventObject, element, additionalInfo = {}) {
        STATE.eventCount++;
        STATE.lastActivity = new Date();
        STATE.isIdle = false;
        
        const logData = {
            event_number: STATE.eventCount,
            timestamp: getTimestamp(),
            relative_time_ms: getRelativeTime(),
            type_of_event: eventType,
            event_object: eventObject,
            element_identifier: element ? getElementIdentifier(element) : 'N/A',
            element_tag: element ? element.tagName.toLowerCase() : 'N/A',
            element_path: element ? getElementPath(element) : 'N/A',
            session_info: {
                time_on_page_ms: Date.now() - STATE.sessionStart.getTime(),
                total_events: STATE.eventCount,
                max_scroll_depth: STATE.maxScrollDepth
            },
            ...additionalInfo
        };
        
        // Styled console output
        const eventColors = {
            click: '#667eea',
            view: '#4caf50',
            scroll: '#2196f3',
            page_view: '#9c27b0',
            mouse_move: '#ff9800',
            keyboard: '#f44336',
            change: '#00bcd4',
            submit: '#e91e63',
            copy: '#795548',
            paste: '#607d8b',
            resize: '#3f51b5',
            visibility_change: '#cddc39',
            idle: '#9e9e9e'
        };
        
        const color = eventColors[eventType] || '#666';
        
        console.group(`%c🎯 Event #${STATE.eventCount}: ${eventType.toUpperCase()}`, 
            `color: white; background: ${color}; padding: 4px 8px; border-radius: 4px; font-weight: bold;`);
        console.log('%cTimestamp:', 'font-weight: bold; color: #2196f3;', logData.timestamp);
        console.log('%cEvent Type:', 'font-weight: bold; color: #4caf50;', logData.type_of_event);
        console.log('%cEvent Object:', 'font-weight: bold; color: #ff9800;', logData.event_object);
        
        if (element) {
            console.log('%cElement:', 'font-weight: bold; color: #9c27b0;', logData.element_identifier);
            console.log('%cElement Path:', 'font-weight: bold; color: #795548;', logData.element_path);
        }
        
        if (Object.keys(additionalInfo).length > 0) {
            console.log('%cAdditional Info:', 'font-weight: bold; color: #f44336;', additionalInfo);
        }
        
        console.log('%cFull Event Data:', 'font-weight: bold; color: #607d8b;', logData);
        console.groupEnd();
        
        return logData;
    }
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    // PAGE VIEW
    window.addEventListener('load', function() {
        logEvent('page_view', 'page', document.body, getPageMetadata());
    });
    
    // CLICK EVENTS
    document.addEventListener('click', function(e) {
        const element = e.target;
        const elementType = getElementType(element);
        
        logEvent('click', elementType, element, {
            coordinates: { 
                x: e.clientX, 
                y: e.clientY,
                pageX: e.pageX,
                pageY: e.pageY
            },
            button: e.button,
            buttons: e.buttons,
            ctrl_key: e.ctrlKey,
            shift_key: e.shiftKey,
            alt_key: e.altKey,
            meta_key: e.metaKey,
            detail: e.detail // click count
        });
    }, true);
    
    // DOUBLE CLICK
    document.addEventListener('dblclick', function(e) {
        const element = e.target;
        const elementType = getElementType(element);
        
        logEvent('double_click', elementType, element, {
            coordinates: { x: e.clientX, y: e.clientY }
        });
    }, true);
    
    // RIGHT CLICK (Context Menu)
    document.addEventListener('contextmenu', function(e) {
        const element = e.target;
        const elementType = getElementType(element);
        
        logEvent('right_click', elementType, element, {
            coordinates: { x: e.clientX, y: e.clientY }
        });
    }, true);
    
    // FORM CHANGE EVENTS
    document.addEventListener('change', function(e) {
        const element = e.target;
        const elementType = getElementType(element);
        
        logEvent('change', elementType, element, {
            value: element.type === 'password' ? '***' : element.value,
            checked: element.checked,
            selected_index: element.selectedIndex,
            selected_options: element.selectedOptions ? 
                Array.from(element.selectedOptions).map(opt => opt.value) : undefined
        });
    }, true);
    
    // INPUT EVENTS
    document.addEventListener('input', function(e) {
        const element = e.target;
        const elementType = getElementType(element);
        
        logEvent('input', elementType, element, {
            value_length: element.value ? element.value.length : 0,
            input_type: e.inputType
        });
    }, true);
    
    // FOCUS EVENTS
    document.addEventListener('focus', function(e) {
        const element = e.target;
        const elementType = getElementType(element);
        
        if (['input', 'select', 'textarea', 'button'].includes(element.tagName.toLowerCase()) || 
            element.contentEditable === 'true') {
            logEvent('focus', elementType, element);
        }
    }, true);
    
    // BLUR EVENTS
    document.addEventListener('blur', function(e) {
        const element = e.target;
        const elementType = getElementType(element);
        
        if (['input', 'select', 'textarea', 'button'].includes(element.tagName.toLowerCase()) || 
            element.contentEditable === 'true') {
            logEvent('blur', elementType, element);
        }
    }, true);
    
    // FORM SUBMISSION
    document.addEventListener('submit', function(e) {
        const element = e.target;
        
        logEvent('submit', 'form', element, {
            action: element.action,
            method: element.method,
            form_data_count: new FormData(element).entries().length
        });
    }, true);
    
    // KEYBOARD EVENTS
    if (CONFIG.trackKeyboard) {
        document.addEventListener('keydown', function(e) {
            logEvent('keyboard', 'keydown', e.target, {
                key: e.key,
                code: e.code,
                key_code: e.keyCode,
                ctrl_key: e.ctrlKey,
                shift_key: e.shiftKey,
                alt_key: e.altKey,
                meta_key: e.metaKey,
                repeat: e.repeat
            });
        });
        
        document.addEventListener('keyup', function(e) {
            logEvent('keyboard', 'keyup', e.target, {
                key: e.key,
                code: e.code
            });
        });
    }
    
    // SCROLL EVENTS (Throttled)
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() {
            const scrollInfo = getScrollInfo();
            STATE.scrollDepth = scrollInfo.scroll_percentage;
            
            if (scrollInfo.scroll_percentage > STATE.maxScrollDepth) {
                STATE.maxScrollDepth = scrollInfo.scroll_percentage;
            }
            
            logEvent('scroll', 'page', document.body, scrollInfo);
        }, CONFIG.scrollThrottle);
    });
    
    // MOUSE MOVEMENT (Throttled)
    if (CONFIG.trackMouseMovement) {
        let mouseMoveTimeout;
        let lastMouseLog = 0;
        
        document.addEventListener('mousemove', function(e) {
            STATE.mouseTrail.push({ x: e.clientX, y: e.clientY, time: Date.now() });
            if (STATE.mouseTrail.length > 10) STATE.mouseTrail.shift();
            
            const now = Date.now();
            if (now - lastMouseLog > CONFIG.mouseMoveThrottle) {
                lastMouseLog = now;
                
                logEvent('mouse_move', 'cursor', e.target, {
                    coordinates: { x: e.clientX, y: e.clientY },
                    movement: { x: e.movementX, y: e.movementY },
                    buttons: e.buttons
                });
            }
        });
    }
    
    // MOUSE ENTER/LEAVE
    document.addEventListener('mouseenter', function(e) {
        const element = e.target;
        const elementType = getElementType(element);
        
        if (element.tagName && ['button', 'a', 'img'].includes(element.tagName.toLowerCase())) {
            logEvent('mouse_enter', elementType, element);
        }
    }, true);
    
    document.addEventListener('mouseleave', function(e) {
        const element = e.target;
        const elementType = getElementType(element);
        
        if (element.tagName && ['button', 'a', 'img'].includes(element.tagName.toLowerCase())) {
            logEvent('mouse_leave', elementType, element);
        }
    }, true);
    
    // CLIPBOARD EVENTS
    if (CONFIG.trackClipboard) {
        document.addEventListener('copy', function(e) {
            const selection = window.getSelection().toString();
            logEvent('copy', 'text', e.target, {
                text_length: selection.length,
                text_preview: selection.substring(0, 50)
            });
        });
        
        document.addEventListener('cut', function(e) {
            const selection = window.getSelection().toString();
            logEvent('cut', 'text', e.target, {
                text_length: selection.length,
                text_preview: selection.substring(0, 50)
            });
        });
        
        document.addEventListener('paste', function(e) {
            logEvent('paste', 'text', e.target, {
                element_type: getElementType(e.target)
            });
        });
    }
    
    // WINDOW RESIZE (Throttled)
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            logEvent('resize', 'window', document.body, {
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                },
                orientation: window.screen.orientation ? window.screen.orientation.type : 'unknown'
            });
        }, CONFIG.resizeThrottle);
    });
    
    // PAGE VISIBILITY CHANGE
    document.addEventListener('visibilitychange', function() {
        logEvent('visibility_change', 'page', document.body, {
            visibility_state: document.visibilityState,
            hidden: document.hidden
        });
    });
    
    // ONLINE/OFFLINE
    window.addEventListener('online', function() {
        logEvent('connection', 'online', document.body);
    });
    
    window.addEventListener('offline', function() {
        logEvent('connection', 'offline', document.body);
    });
    
    // BEFORE UNLOAD (Page Exit)
    window.addEventListener('beforeunload', function() {
        logEvent('page_exit', 'page', document.body, {
            time_on_page: Date.now() - STATE.sessionStart.getTime(),
            total_events: STATE.eventCount,
            max_scroll_depth: STATE.maxScrollDepth
        });
    });
    
    // MEDIA EVENTS (Video/Audio)
    document.addEventListener('play', function(e) {
        if (e.target.tagName && ['video', 'audio'].includes(e.target.tagName.toLowerCase())) {
            logEvent('media_play', e.target.tagName.toLowerCase(), e.target, {
                current_time: e.target.currentTime,
                duration: e.target.duration,
                src: e.target.src
            });
        }
    }, true);
    
    document.addEventListener('pause', function(e) {
        if (e.target.tagName && ['video', 'audio'].includes(e.target.tagName.toLowerCase())) {
            logEvent('media_pause', e.target.tagName.toLowerCase(), e.target, {
                current_time: e.target.currentTime,
                duration: e.target.duration
            });
        }
    }, true);
    
    document.addEventListener('ended', function(e) {
        if (e.target.tagName && ['video', 'audio'].includes(e.target.tagName.toLowerCase())) {
            logEvent('media_ended', e.target.tagName.toLowerCase(), e.target);
        }
    }, true);
    
    // SELECTION EVENTS
    document.addEventListener('selectionchange', function() {
        const selection = window.getSelection();
        if (selection.toString().length > 0) {
            logEvent('text_selection', 'text', selection.anchorNode ? selection.anchorNode.parentElement : null, {
                selected_text: selection.toString().substring(0, 100),
                selection_length: selection.toString().length
            });
        }
    });
    
    // DRAG AND DROP
    document.addEventListener('dragstart', function(e) {
        logEvent('drag_start', getElementType(e.target), e.target);
    }, true);
    
    document.addEventListener('dragend', function(e) {
        logEvent('drag_end', getElementType(e.target), e.target);
    }, true);
    
    document.addEventListener('drop', function(e) {
        logEvent('drop', getElementType(e.target), e.target, {
            files_count: e.dataTransfer.files.length,
            types: Array.from(e.dataTransfer.types)
        });
    }, true);
    
    // ELEMENT VISIBILITY TRACKING (Intersection Observer)
    if (CONFIG.trackVisibility) {
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting && !STATE.observedElements.has(entry.target)) {
                    STATE.observedElements.add(entry.target);
                    const elementType = getElementType(entry.target);
                    logEvent('view', elementType, entry.target, {
                        visibility_ratio: Math.round(entry.intersectionRatio * 100) + '%',
                        bounding_rect: entry.boundingClientRect
                    });
                }
            });
        }, { threshold: CONFIG.visibilityThreshold });
        
        // Observe all potentially interesting elements
        setTimeout(function() {
            const selector = 'button, a, img, video, audio, select, input, textarea, h1, h2, h3, [role="button"], [data-track]';
            const elementsToObserve = document.querySelectorAll(selector);
            elementsToObserve.forEach(function(el) {
                observer.observe(el);
            });
        }, 1000);
    }
    
    // IDLE DETECTION
    let idleTimer;
    function resetIdleTimer() {
        clearTimeout(idleTimer);
        if (STATE.isIdle) {
            STATE.isIdle = false;
            logEvent('user_active', 'session', document.body, {
                idle_duration_ms: Date.now() - STATE.lastActivity.getTime()
            });
        }
        
        idleTimer = setTimeout(function() {
            STATE.isIdle = true;
            logEvent('user_idle', 'session', document.body, {
                idle_timeout_ms: CONFIG.idleTimeout,
                last_activity: STATE.lastActivity.toISOString()
            });
        }, CONFIG.idleTimeout);
    }
    
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(function(event) {
        document.addEventListener(event, resetIdleTimer, true);
    });
    
    resetIdleTimer();
    
    // ============================================
    // PUBLIC API
    // ============================================
    
    window.EventTracker = {
        getStats: function() {
            return {
                total_events: STATE.eventCount,
                session_duration_ms: Date.now() - STATE.sessionStart.getTime(),
                max_scroll_depth: STATE.maxScrollDepth,
                current_scroll: getScrollInfo().scroll_percentage,
                is_idle: STATE.isIdle,
                last_activity: STATE.lastActivity.toISOString()
            };
        },
        
        logCustomEvent: function(eventName, eventObject, additionalInfo) {
            logEvent(eventName, eventObject, document.activeElement, additionalInfo);
        },
        
        getConfig: function() {
            return { ...CONFIG };
        },
        
        updateConfig: function(newConfig) {
            Object.assign(CONFIG, newConfig);
            console.log('Config updated:', CONFIG);
        },
        
        getSummary: function() {
            const stats = this.getStats();
            console.group('%c📊 EVENT TRACKER SUMMARY', 
                'color: white; background: #4caf50; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 16px;');
            console.log('Session started:', STATE.sessionStart.toISOString());
            console.log('Total events tracked:', stats.total_events);
            console.log('Session duration:', Math.round(stats.session_duration_ms / 1000), 'seconds');
            console.log('Max scroll depth:', stats.max_scroll_depth + '%');
            console.log('User idle:', stats.is_idle);
            console.log('Last activity:', stats.last_activity);
            console.log('Page metadata:', getPageMetadata());
            console.groupEnd();
        }
    };
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    console.log('%c🚀 Universal Event Tracker Initialized', 
        'color: white; background: #4caf50; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 14px;');
    console.log('📊 Tracking: clicks, views, scrolls, keyboard, mouse, forms, media, visibility, and more');
    console.log('⚙️  Config: window.EventTracker.updateConfig({ scrollThrottle: 1000 })');
    
})();