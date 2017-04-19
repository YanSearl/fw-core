(function (func, scope) {
    if (typeof scope.FinancialWorkspace !== "undefined") return;
    scope.FinancialWorkspace = scope.$FW = func();
})(function () {

    var FW = function (selector) {
    };

    FW.extend = function (collection) {
        for (var i in collection) {
            if (collection.hasOwnProperty(i) && typeof FW[i] === 'undefined')
                FW[i] = collection[i];
        }
    };

    FW._global = {
        readyList: [],
        eventMap: {},
        loginRedirect: location.pathname + location.search
    };

    var fn = FW.prototype = {
        DOMReady: function (cb) {
            document.readyState === 'complete' ?
                runInCatch(cb) :
                FW._global.readyList.push(cb);
        },
        Capture: function (e) {
            captureE(e)
        },
        setAjaxErrorHandler: function (fn) {
            FW.AjaxErrorHandler = fn;
        },
        AjaxErrorHandler: function (code, msg, responseText) {
            window.console && console.error && console.error(code, msg, responseText);
            throw new Error('this method should be override');
        },
        /*
         * Ajax ����, ��Խ��ڹ�����װ����������,
         *    ����ͳһ�ķ���ֵ����Ҫ�󷵻�ֵ������ָ����JSON��ʽ
         */
        Ajax: function (options) {
            var cfg = {
                url: '',
                method: 'GET',
                data: {},
                success: null,
                complete: null,
                fail: null,
                slience: false, // �����ؽ�� code �� 10000 ʱ, ֻ reject ������������
                withCredentials: false,

                enable_loading: false
            };
            // ���д��, ����������ֻ��һ���ַ���, ��ô��Ĭ��ʹ�� GET ��������ַ�����ʾ�ĵ�ַ
            if (typeof (options) == 'string') options = {
                url: options,
                enable_loading: 'mini'
            };

            for (var i in cfg) {
                if (cfg.hasOwnProperty(i) && typeof (options[i]) !== 'undefined')
                    cfg[i] = options[i]
            }
            // ���ajax������ʽ��Ĭ������, Ŀǰ�� default(����ת����Ȧ) �� mini(ת��СԲȦ) ����
            if (cfg.enable_loading === true) cfg.enable_loading = 'default';

            var xhr = new XMLHttpRequest();

            if (typeof (cfg.data) == 'object') {
                // αװ�� PUT or DELETE ����
                if (cfg.method.toUpperCase() === 'PUT') cfg.data['_method'] = 'put';
                if (cfg.method.toUpperCase() == 'DELETE') cfg.data['_method'] = 'delete';

                var formData = '';
                for (var i in cfg.data) {
                    if (!cfg.data.hasOwnProperty(i)) continue;
                    if (cfg.data[i] === null || cfg.data[i] === undefined) continue;
                    if (formData) formData += '&';
                    formData += i + '=' + cfg.data[i];
                }
            } else {
                formData = cfg.data;
            }

            var url = cfg.url;
            if (cfg.method.toUpperCase() == 'GET' && formData) {
                url.indexOf('?') > 0 ? url += '&' + formData : url += '?' + formData
            }
            xhr.open(cfg.method.toUpperCase() == 'GET' ? 'GET' : 'POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.withCredentials = !!cfg.withCredentials;
            if (cfg.enable_loading) FW.Component.showAjaxLoading(cfg.enable_loading);

            var p = new Promise(function (resolve, reject) {
                xhr.onreadystatechange = function () {
                    if (xhr.readyState == 4) {
                        if (cfg.enable_loading) FW.Component.hideAjaxLoading();

                        if (xhr.status == 200 || xhr.status == 201) {
                            var r = JSON.parse(xhr.responseText);
                            cfg.complete && cfg.complete(r);

                            if (r.code == 10000) {
                                cfg.success && cfg.success(r.data);
                                resolve(r.data);
                            } else {
                                if (cfg.fail && cfg.fail(r.code, r.message, xhr.responseText) === true) {
                                    // �Ѿ����Լ��Ĵ��������������,
                                    // if return value is true, no more handle functions
                                    // ���Ϊ����ҪĬ�ϴ�����
                                } else {
                                    // slience ����, ��ʾ��ʹ���ִ���Ҳ��ȡ��Ĭ����ķ�ʽ
                                    // �������־�Ĭ����ʽ, �ɸ���Ŀ�Լ����쳣����������
                                    FW.AjaxErrorHandler(r.code, r.message, cfg.slience);
                                    reject(r);
                                }
                            }
                        } else if (xhr.status == 404) {
                            FW.Component.Alert('API�����ڣ���ȷ�Ͻӿڵ�ַ��ȷ')
                        } else if (xhr.status >= 500) {
                            //if (xhr.status == 0) FW.Component.Alert('cross domain deny, check server config: Access-Control-Allow-Origin');
                            FW.Component.Alert('��������С����~ ���Ժ�����(' + xhr.status + ')');
                        } else {
                            if (xhr.status !== 0)
                                FW.Component.Alert('ERROR, HTTP status code: ' + xhr.status + ' ' + cfg.url);
                        }

                        if (xhr.status > 201) {
                            // Ajax����״̬�벻��200��201���϶�Ϊ�쳣, ��Ҫ�ϱ�
                            var e = 'Ajax Error ' +
                                '\n status code: ' + xhr.status +
                                '\n url: ' + cfg.url +
                                '\n method: ' + cfg.method +
                                '\n data: ' + JSON.stringify(cfg.data);
                            FW.Capture(e);
                        }
                    }
                };
            });
            xhr.send(formData);

            return p;
        },
        /*
         * Ajax �ļ򻯰�, ������Post����
         * ����3����Ҫ����
         * url: �����ַ
         * data: �������
         * success: �ɹ����ִ�к���
         * Post���� use "slience" option,
         */
        Post: function (url, data, loading, slience) {
            return FW.Ajax({
                url: url,
                method: 'POST',
                data: data,
                enable_loading: loading || 'mini',
                slience: slience === undefined ? true : !!slience
            })
        },
        /**
         * JSONP handler
         *
         * Options:
         *
         * @param {String} url
         * @param {Object|Function} optional options / callback
         * @param {Function} optional callback
         */
        getJSONP: function (url, params, fn) {
            if ('function' == typeof params) {
                fn = params;
                params = {};
            }

            var enc = encodeURIComponent;

            var formData = '';
            for (var i in params) {
                if (!params.hasOwnProperty(i)) continue;
                if (params[i] === null) continue;
                if (formData) formData += '&';
                formData += i + '=' + enc(params[i]);
            }

            // use the callback name that was passed if one was provided.
            // otherwise generate a unique name by incrementing our counter.
            var id = '__jp' + (+new Date()) + Math.random().toString().substr(3, 5);

            var target = document.getElementsByTagName('script')[0] || document.head;
            var script;

            // add qs component
            url += (~url.indexOf('?') ? '&' : '?') + 'callback=' + enc(id);
            if (formData) url += '&' + formData;
            script = document.createElement('script');
            script.async = true;
            script.src = url;

            return new Promise(function (resolve, reject) {
                var timer = setTimeout(function () {
                    var err = new Error('JSONP request timeout');
                    cleanup();
                    // fn && fn(err);
                    reject(err);
                }, 3500);

                function cleanup() {
                    if (script.parentNode) script.parentNode.removeChild(script);
                    clearTimeout(timer);
                    window[id] = function () {
                        delete window[id];
                    }
                }

                window[id] = function (data) {
                    cleanup();
                    fn && fn(data);
                    resolve(data);
                };

                target.parentNode.insertBefore(script, target);
            });
        },
        setLoginRedirect: function (url) {
            // if (url.indexOf('http') < 0) url = location.protocol + '//' + location.host + url;
            this._global.loginRedirect = url;
        },
        getLoginRedirect: function () {
            return this._global.loginRedirect;
        },
        Format: {
            // ��ʽ�����֣� 123456789.01 => 123,456,789.01
            // �������д�����Լ�Ҳ��������~ ������Ҫ��
            currency: function (price, precision) {
                var p = parseFloat(price),
                    i = Math.abs(parseInt(p)),
                    j = parseInt(Math.round(Math.abs(p) * 100) - i * 100),
                    s = [];
                while (i > 1000) {
                    i = i / 1000;
                    s.push(((i.toString().split('.')[1] || '') + '000').substr(0, 3));
                    i = parseInt(i);
                }
                s = (i == 1000 ? ['1', '000'] : [i.toString()]).concat(s.reverse());
                return (p >= 0 ? '' : '-') + s.join(',') + (j ? '.' + (j < 10 ? '0' + j : j) : (precision ? '.00' : ''))
            },
            urlQuery: function () {
                var s = window.location.search;
                if (s.indexOf('?') == 0) s = s.substr(1);
                if (s.indexOf('#') >= 0) s = s.substr(0, s.indexOf('#'));

                var r = {};
                s.split('&').forEach(function (kv) {
                    var t = kv.split('=');
                    r[t[0]] = decodeURIComponent(t[1]);
                });
                return r;
            },
            trim: function (s) {
                return s.replace(/(^\s*)|(\s*$)/g, '')
            }
        },
        Event: {
            slideDownRefresh: function () {
                if (FW._global.eventMap['slide_down_refresh'])
                    throw ('duplicated event listener on slide down');

                var _start_y, _end_y, threshold = 200;
                var fnMove = function (event) {

                    if (_start_y == null && document.body.scrollTop < 1)
                        _start_y = event.targetTouches[0].clientY;

                    if (_start_y) {

                        var y = event.targetTouches[0].clientY,
                            delta;
                        if (_end_y == null || y > _end_y) {
                            _end_y = y;
                            delta = Math.min(_end_y - _start_y, threshold);
                        }

                        if (delta) {
                            upper.style.height = delta / threshold * 80 + 'px';
                            upper.style.paddingTop = delta - 50 + 'px';
                            document.body.style.paddingTop = delta + 'px';
                            if (delta >= threshold) {
                                upper.innerText = '�ɿ�ˢ��'
                            }
                        }
                    }
                };
                var fnEnd = function (event) {
                    if (_end_y - _start_y > threshold) {
                        location.reload();
                    } else {
                        upper.style.height = '0px';
                        upper.style.paddingTop = '0px';
                        document.body.style.paddingTop = '0px';
                    }
                    _start_y = null, _end_y = null;
                };

                FW._global.eventMap['slide_down_refresh'] = [fnMove, fnEnd];

                var upper = document.createElement('div'),
                    body = document.body;
                upper.id = '_id_slide_down_refresh_div';
                upper.innerText = '����ˢ��';
                upper.setAttribute('style', 'height: 0; overflow: hidden; position: absolute; top: 0; width: 100%;line-height: 50px; text-align: center; font-size: 26px; color: #555;')
                body.insertBefore(upper, body.childNodes[0]);
                //document.body.addEventListener('touchmove', fnMove);
                //document.body.addEventListener('touchend', fnEnd);
            },

            cancelSlideDownRefresh: function () {
                document.body.removeEventListener('touchmove', FW._global.eventMap['slide_down_refresh'][0]);
                document.body.removeEventListener('touchend', FW._global.eventMap['slide_down_refresh'][1]);
                document.body.removeChild(document.getElementById('_id_slide_down_refresh_div'));
            },

            touchBottom: function (cb) {
                if (FW._global.eventMap['touch_bottom_fn'])
                    throw ('duplicated event listener on slide up');

                var fn = function () {
                    //�жϹ�������������ҳ��ײ�
                    if (window.innerHeight + document.body.scrollTop + document.documentElement.scrollTop + 50 > document.body.scrollHeight) {
                        if (FW._global.eventMap['touch_bottom'] == 'running') return;
                        FW._global.eventMap['touch_bottom'] = 'running';
                        cb(function () {
                            FW._global.eventMap['touch_bottom'] = 'ready';
                        })
                    }
                };
                FW._global.eventMap['touch_bottom_fn'] = fn;
                window.addEventListener("scroll", fn, false);
            },
            cancelTouchBottom: function () {
                window.removeEventListener('scroll', FW._global.eventMap['touch_bottom_fn'])
            }
        },
        Utils: {
            length: function (obj, filter) {
                var filter_func = filter || function () {
                    return true
                };
                var len = 0;
                if (obj instanceof Array) {
                    for (var i = 0; i < obj.length; i++) {
                        if (filter_func(obj[i])) len++
                    }
                } else if (obj instanceof Object) {
                    for (var j in obj) {
                        if (obj.hasOwnProperty(j) && filter_func(j)) len++;
                    }
                } else {
                    throw 'can not compute length of: ' + obj.toString();
                }
                return len;
            },
            jsonFilter: function (obj, filter) {
                if (typeof (obj) != 'object') throw obj + ' is not a JSON object';
                var filter_func = filter || function () {
                    return true
                };
                var result = {};
                for (var i in obj) {
                    if (filter_func(obj[i])) {
                        result[i] = obj[i]
                    }
                }
                return result;
            },
            _login: function (param) {
                if (FW.Browser.inApp() && NativeBridge) {
                    NativeBridge.login()
                } else {
                    // is_mall=1 �����ж�, ��¼���������̳�, ���ص�ַ��Ҫ����̳�����
                    // is_mall=2 WAP
                    location.href = location.protocol + '//m.9888.cn/mpwap/orderuser/toLogin.shtml?' + param + '&redirect_url=' + FW.getLoginRedirect();
                }
            },
            loginMall: function () {
                FW.Utils._login('is_mall=1')
            },
            loginWap: function () {
                FW.Utils._login('is_mall=2')
            },
            shouldShowHeader: function () {
                // return !FW.Browser.inApp()
                return true
            }
        },
        Browser: {
            inApp: function () {
                return navigator.userAgent.indexOf('FinancialWorkshop') >= 0;
            },
            appVersion: function () {
                var r = navigator.userAgent.match(/FinancialWorkshop\/(\d+.\d+.\d+)/);
                return r ? r[1] : '0';
            },
            inAndroid: function () {
                return navigator.userAgent.match(/Android/i) ? true : false;
            },
            inIOS: function () {
                return navigator.userAgent.match(/iPhone|iPad|iPod/i) ? true : false;
            },
            inMobile: function () {
                var fb = FW.Browser;
                return fb.inAndroid() || fb.inIOS();
            },
            inIOSApp: function () {
                return FW.Browser.inApp() && FW.Browser.inIOS()
            },
            inAndroidApp: function () {
                return FW.Browser.inApp() && FW.Browser.inAndroid()
            },
            inWeixin: function () {
                return navigator.userAgent.indexOf('MicroMessenger') >= 0
            }
        },
        AppVersion: {
            // ��ΪApp�ᶨ��ǿ�Ƹ���, �ܶ�������App�ķ���Ҳ���Appǿ�ƹ���, ���ֹ�����ϵ
            // ��һֱ����, App����Ƕ��ҳ���ÿ�ͷԼ���ķ�ʽ, ��˴��ںܶ಻���ĵ���Ĭ��Լ��
            // ����Լ������ͨ������ֱ�ӱ��ֳ���, ���ǻ�Ӱ�쵽���ճ��ֽ�� ... add by Delong. 2016-12-19
        },
        AppBridge: {
            _getBridge: function () {
                if (typeof (NativeBridge) === 'undefined') throw 'NativeBridge is not define';
                return NativeBridge;
            },
            _words: {
                toNative: {
                    '�������п���': 'app_open_hs_account'
                }
            },
            send: function (keyword, value) {
                var bridge = FW.AppBridge._getBridge();
                var words = FW.AppBridge._words;
                if (keyword == '����') {
                    bridge.setTitle(value)
                } else if (keyword == '��¼') {
                    bridge.login(value)
                } else {
                    if (words.toNative[keyword]) {
                        bridge.toNative(words.toNative[keyword])
                    } else {
                        throw 'can not handle this keyword in NativeBridge: ' + keyword + ' ' + value;
                    }
                }
            }
        },
        Component: {
            getReactDOM: function () {
                if (!ReactDOM) throw 'ReactDOM is not define. maybe you have not include react-dom.js';
                if (ReactDOM.version < '15') throw 'React version is:' + ReactDOM.version + ', we need at least 15';
                return ReactDOM;
            },
            _createTemporaryDOMNode: function (id) {
                var element = document.getElementById(id);

                if (!element) {
                    element = document.createElement('div');
                    element.id = id;
                    document.body.appendChild(element);
                }
                return element;
            },
            showAjaxLoading: function (theme) {
                if (!window.GlobalLoading) throw 'GlobalLoading is not define';
                var id = '_id_react_component_global_loading';
                var element = document.getElementById(id);
                if (!element) {
                    element = document.createElement('div');
                    element.id = id;
                    document.body.appendChild(element);
                }
                FW.Component.getReactDOM().render(React.createElement(GlobalLoading, {
                    theme: theme || 'mini',
                    unMountHandler: function () {
                        element.parentNode.removeChild(element)
                    }
                }), element);
                setTimeout(FW.Component.hideAjaxLoading, 6900);
            },
            hideAjaxLoading: function () {
                var id = '_id_react_component_global_loading';
                if (document.getElementById(id)) {
                    FW.Component.getReactDOM().unmountComponentAtNode(
                        document.getElementById(id));
                }
            },
            Alert: function (title, options) {
                options = options || {};
                var id = '_id_react_component_global_alert',
                    node = FW.Component._createTemporaryDOMNode(id);

                FW.Component.getReactDOM().render(React.createElement(GlobalAlert, {
                    id: id,
                    title: title,
                    header: options.header,
                    confirm_text: 'ȷ��',
                    unMountAlert: function () {
                        node.parentNode.removeChild(node)
                    }
                }), node);
            },
            Toast: function (data) {
                var id = '_id_react_component_global_toast',
                    node = FW.Component._createTemporaryDOMNode(id);

                FW.Component.getReactDOM().render(React.createElement(GlobalToast, {
                    id: id,
                    text: data,
                    unMountToast: function () {
                        node.parentNode.removeChild(node)
                    }
                }), node);

            },
            Confirm: function (title, confirmCallback) {
                title = title || 'ȷ��?';
                var id = '_id_react_component_global_confirm',
                    node = FW.Component._createTemporaryDOMNode(id);

                FW.Component.getReactDOM().render(React.createElement(GlobalConfirm, {
                    id: id,
                    title: title,
                    confirmCallback: confirmCallback,
                    unMountConfirm: function () {
                        node.parentNode.removeChild(node)
                    }
                }), node);
            }
        }
    };

    FW.extend(fn);

    (function () {
        if (document.readyState === "complete") {
            setTimeout(popDOMReadyArr());
        } else {
            // Use the handy event callback
            document.addEventListener("DOMContentLoaded", ready, false);
            // A fallback to window.onload, that will always work
            window.addEventListener("load", ready, false);
        }
    })();

    /**
     * The ready event handler and self cleanup method
     */
    function ready() {
        document.removeEventListener("DOMContentLoaded", ready, false);
        window.removeEventListener("load", ready, false);
        popDOMReadyArr();
    }

    function popDOMReadyArr() {
        FW._global.readyList.forEach(function (cb) {
            runInCatch(function () {
                if (typeof (cb) === 'undefined')
                    throw new Error(cb + ' is undefined');
                if (typeof (cb) !== 'function')
                    throw new Error(cb + ' is not a function');
                cb()
            })
        });
        FW._global.readyList = [];
    }

    function runInCatch(fn) {
        try {
            fn()
        } catch (e) {
            captureE(e)
        }
    }

    function captureE(e) {
        typeof (Raven) === 'object' && Raven.isSetup() && Raven.captureException(e);

        // ����� _vds ��ش���, ����׽, ����growing io�Ĵ���
        if (e && e.toString().indexOf('_vds_hybrid') > -1) return;
        // typeof (Raven) === 'object' && Raven.isSetup() && Raven.captureException(e);
        window.console && console.error && console.error(e);
    }

    return FW;
}, "undefined" !== typeof module && module.exports ? global : window);
