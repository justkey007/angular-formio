"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var formio_service_1 = require("./formio.service");
var formio_loader_1 = require("./formio.loader");
var formio_alerts_1 = require("./formio.alerts");
var formio_config_1 = require("./formio.config");
var Promise = require('native-promise-only');
var Formio = require('formiojs');
var FormioFormCore = require('formiojs/form');
var FormioWizard = require('formiojs/wizard');
var _each = require('lodash/each');
var FormioComponent = (function () {
    function FormioComponent(config, elementRef, loader, alerts) {
        var _this = this;
        this.config = config;
        this.elementRef = elementRef;
        this.loader = loader;
        this.alerts = alerts;
        this.form = null;
        this.submission = {};
        this.readOnly = false;
        if (this.config) {
            Formio.setBaseUrl(this.config.apiUrl);
            Formio.setAppUrl(this.config.appUrl);
            FormioFormCore.setBaseUrl(this.config.apiUrl);
            FormioFormCore.setAppUrl(this.config.appUrl);
            FormioWizard.setBaseUrl(this.config.apiUrl);
            FormioWizard.setAppUrl(this.config.appUrl);
        }
        else {
            console.warn('You must provide an AppConfig within your application!');
        }
        this.ready = new Promise(function (resolve) {
            _this.readyResolve = resolve;
        });
        this.beforeSubmit = new core_1.EventEmitter();
        this.submit = new core_1.EventEmitter();
        this.error = new core_1.EventEmitter();
        this.invalid = new core_1.EventEmitter();
        this.change = new core_1.EventEmitter();
        this.render = new core_1.EventEmitter();
        this.alerts.alerts = [];
    }
    FormioComponent.prototype.setForm = function (form) {
        var _this = this;
        this.form = form;
        // Only initialize a single formio instance.
        if (this.formio) {
            this.formio.form = this.form;
            return;
        }
        if (this.form.display === 'wizard') {
            this.formio = new FormioWizard(null, {
                noAlerts: true,
                readOnly: this.readOnly
            });
        }
        else {
            this.formio = new FormioFormCore(null, {
                noAlerts: true,
                readOnly: this.readOnly
            });
        }
        this.formio.on('change', function (value) { return _this.change.emit(value); });
        this.formio.on('submit', function (submission) { return _this.submitForm(submission); });
        this.formio.on('error', function (err) { return _this.onError(err); });
        this.formio.on('render', function () { return _this.render.emit(true); });
        this.formio.setElement(this.elementRef.nativeElement);
        this.formio.form = this.form;
        this.loader.loading = false;
        this.readyResolve();
    };
    FormioComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.options = Object.assign({
            errors: {
                message: 'Please fix the following errors before submitting.'
            },
            alerts: {
                submitMessage: 'Submission Complete.'
            },
            hooks: {
                beforeSubmit: null
            }
        }, this.options);
        if (this.refresh) {
            this.refresh.subscribe(function (refresh) { return _this.onRefresh(refresh); });
        }
        if (this.form) {
            this.setForm(this.form);
        }
        else if (this.src) {
            if (!this.service) {
                this.service = new formio_service_1.FormioService(this.src);
            }
            this.loader.loading = true;
            this.service.loadForm().subscribe(function (form) {
                if (form && form.components) {
                    _this.setForm(form);
                }
                // if a submission is also provided.
                if (!_this.submission && _this.service.formio.submissionId) {
                    _this.service.loadSubmission().subscribe(function (submission) {
                        _this.submission = _this.formio.submission = submission;
                    }, function (err) { return _this.onError(err); });
                }
            }, function (err) { return _this.onError(err); });
        }
    };
    FormioComponent.prototype.onRefresh = function (refresh) {
        switch (refresh.property) {
            case 'submission':
                this.formio.submission = refresh.value;
                break;
            case 'form':
                this.formio.form = refresh.value;
                break;
        }
    };
    FormioComponent.prototype.ngOnChanges = function (changes) {
        var _this = this;
        if (changes.form && changes.form.currentValue) {
            this.setForm(changes.form.currentValue);
        }
        this.ready.then(function () {
            if (changes.submission && changes.submission.currentValue) {
                _this.formio.submission = changes.submission.currentValue;
            }
            if (changes.hideComponents) {
                _this.formio.hideComponents(changes.hideComponents.currentValue);
            }
        });
    };
    FormioComponent.prototype.onSubmit = function (submission) {
        submission.saved = true;
        this.formio.emit('submit', submission);
        this.submit.emit(submission);
        this.alerts.setAlert({
            type: 'success',
            message: this.options.alerts.submitMessage
        });
    };
    FormioComponent.prototype.onError = function (err) {
        var _this = this;
        this.alerts.setAlerts([]);
        if (!err) {
            return;
        }
        // Make sure it is an array.
        err = (err instanceof Array) ? err : [err];
        // Emit these errors again.
        this.error.emit(err);
        // Iterate through each one and set the alerts array.
        _each(err, function (error) {
            _this.alerts.setAlert({
                type: 'danger',
                message: error.message || error.toString()
            });
        });
    };
    FormioComponent.prototype.submitExecute = function (submission) {
        var _this = this;
        if (this.service) {
            this.service.saveSubmission(submission).subscribe(function (sub) { return _this.onSubmit(sub); }, function (err) { return _this.onError(err); });
        }
        else {
            this.onSubmit(submission);
        }
    };
    FormioComponent.prototype.submitForm = function (submission) {
        var _this = this;
        this.beforeSubmit.emit(submission);
        // if they provide a beforeSubmit hook, then allow them to alter the submission asynchronously
        // or even provide a custom Error method.
        if (this.options.hooks.beforeSubmit) {
            this.options.hooks.beforeSubmit(submission, function (err, sub) {
                if (err) {
                    _this.onError(err);
                    return;
                }
                _this.submitExecute(sub);
            });
        }
        else {
            this.submitExecute(submission);
        }
    };
    return FormioComponent;
}());
__decorate([
    core_1.Input(),
    __metadata("design:type", Object)
], FormioComponent.prototype, "form", void 0);
__decorate([
    core_1.Input(),
    __metadata("design:type", Object)
], FormioComponent.prototype, "submission", void 0);
__decorate([
    core_1.Input(),
    __metadata("design:type", String)
], FormioComponent.prototype, "src", void 0);
__decorate([
    core_1.Input(),
    __metadata("design:type", formio_service_1.FormioService)
], FormioComponent.prototype, "service", void 0);
__decorate([
    core_1.Input(),
    __metadata("design:type", Object)
], FormioComponent.prototype, "options", void 0);
__decorate([
    core_1.Input(),
    __metadata("design:type", Boolean)
], FormioComponent.prototype, "readOnly", void 0);
__decorate([
    core_1.Input(),
    __metadata("design:type", Array)
], FormioComponent.prototype, "hideComponents", void 0);
__decorate([
    core_1.Input(),
    __metadata("design:type", core_1.EventEmitter)
], FormioComponent.prototype, "refresh", void 0);
__decorate([
    core_1.Output(),
    __metadata("design:type", core_1.EventEmitter)
], FormioComponent.prototype, "render", void 0);
__decorate([
    core_1.Output(),
    __metadata("design:type", core_1.EventEmitter)
], FormioComponent.prototype, "submit", void 0);
__decorate([
    core_1.Output(),
    __metadata("design:type", core_1.EventEmitter)
], FormioComponent.prototype, "beforeSubmit", void 0);
__decorate([
    core_1.Output(),
    __metadata("design:type", core_1.EventEmitter)
], FormioComponent.prototype, "change", void 0);
__decorate([
    core_1.Output(),
    __metadata("design:type", core_1.EventEmitter)
], FormioComponent.prototype, "invalid", void 0);
__decorate([
    core_1.Output(),
    __metadata("design:type", core_1.EventEmitter)
], FormioComponent.prototype, "error", void 0);
FormioComponent = __decorate([
    core_1.Component({
        selector: 'formio',
        template: '<div>' +
            '<formio-loader></formio-loader>' +
            '<formio-alerts></formio-alerts>' +
            '</div>',
        styles: ['.flatpickr-calendar{background:0 0;overflow:hidden;max-height:0;opacity:0;visibility:hidden;text-align:center;padding:0;animation:none;direction:ltr;border:0;font-size:14px;line-height:24px;border-radius:5px;position:absolute;width:315px;box-sizing:border-box;background:#fff;box-shadow:1px 0 0 #e6e6e6,-1px 0 0 #e6e6e6,0 1px 0 #e6e6e6,0 -1px 0 #e6e6e6,0 3px 13px rgba(0,0,0,.08)}.flatpickr-calendar.inline,.flatpickr-calendar.open{opacity:1;visibility:visible;overflow:visible;max-height:640px}.flatpickr-calendar.open{display:inline-block;animation:flatpickrFadeInDown .3s cubic-bezier(0,1,.5,1);z-index:99999}.flatpickr-calendar.inline{display:block;position:relative;top:2px}.flatpickr-calendar.static{position:absolute;top:calc(100% + 2px)}.flatpickr-calendar.static.open{z-index:999;display:block}.flatpickr-calendar.hasWeeks{width:auto}.flatpickr-calendar.showTimeInput.hasTime .flatpickr-time{height:40px;border-top:1px solid #e6e6e6}.flatpickr-calendar.noCalendar.hasTime .flatpickr-time{height:auto}.flatpickr-calendar:after,.flatpickr-calendar:before{position:absolute;display:block;pointer-events:none;border:solid transparent;content:\'\';height:0;width:0;left:22px}.flatpickr-calendar.rightMost:after,.flatpickr-calendar.rightMost:before{left:auto;right:22px}.flatpickr-calendar:before{border-width:5px;margin:0 -5px}.flatpickr-calendar:after{border-width:4px;margin:0 -4px}.flatpickr-calendar.arrowTop:after,.flatpickr-calendar.arrowTop:before{bottom:100%}.flatpickr-calendar.arrowTop:before{border-bottom-color:#e6e6e6}.flatpickr-calendar.arrowTop:after{border-bottom-color:#fff}.flatpickr-calendar.arrowBottom:after,.flatpickr-calendar.arrowBottom:before{top:100%}.flatpickr-calendar.arrowBottom:before{border-top-color:#e6e6e6}.flatpickr-calendar.arrowBottom:after{border-top-color:#fff}.flatpickr-wrapper{position:relative;display:inline-block}.flatpickr-month{background:0 0;color:rgba(0,0,0,.9);fill:rgba(0,0,0,.9);height:28px;line-height:24px;text-align:center;position:relative;user-select:none}.flatpickr-next-month,.flatpickr-prev-month{text-decoration:none;cursor:pointer;position:absolute;top:10px;height:16px;line-height:16px}.flatpickr-next-month i,.flatpickr-prev-month i{position:relative}.flatpickr-next-month.flatpickr-prev-month,.flatpickr-prev-month.flatpickr-prev-month{left:calc(3.57% - 1.5px)}.flatpickr-next-month.flatpickr-next-month,.flatpickr-prev-month.flatpickr-next-month{right:calc(3.57% - 1.5px)}.flatpickr-next-month:hover,.flatpickr-prev-month:hover{color:#959ea9}.flatpickr-next-month:hover svg,.flatpickr-prev-month:hover svg{fill:#f64747}.flatpickr-next-month svg,.flatpickr-prev-month svg{width:14px}.flatpickr-next-month svg path,.flatpickr-prev-month svg path{transition:fill .1s;fill:inherit}.numInputWrapper{position:relative;height:auto}.numInputWrapper input,.numInputWrapper span{display:inline-block}.numInputWrapper input{width:100%}.numInputWrapper span{position:absolute;right:0;width:14px;padding:0 4px 0 2px;height:50%;line-height:50%;opacity:0;cursor:pointer;border:1px solid rgba(57,57,57,.05);box-sizing:border-box}.numInputWrapper span:hover{background:rgba(0,0,0,.1)}.numInputWrapper span:active{background:rgba(0,0,0,.2)}.numInputWrapper span:after{display:block;content:"";position:absolute;top:33%}.numInputWrapper span.arrowUp{top:0;border-bottom:0}.numInputWrapper span.arrowUp:after{border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:4px solid rgba(57,57,57,.6)}.numInputWrapper span.arrowDown{top:50%}.numInputWrapper span.arrowDown:after{border-left:4px solid transparent;border-right:4px solid transparent;border-top:4px solid rgba(57,57,57,.6)}.numInputWrapper span svg{width:inherit;height:auto}.numInputWrapper span svg path{fill:rgba(0,0,0,.5)}.numInputWrapper:hover{background:rgba(0,0,0,.05)}.numInputWrapper:hover span{opacity:1}.flatpickr-current-month{font-size:135%;line-height:inherit;font-weight:300;color:inherit;position:absolute;width:75%;left:12.5%;top:5px;display:inline-block;text-align:center}.flatpickr-current-month span.cur-month{font-family:inherit;font-weight:700;color:inherit;display:inline-block;margin-left:7px;padding:0}.flatpickr-current-month span.cur-month:hover{background:rgba(0,0,0,.05)}.flatpickr-current-month .numInputWrapper{width:6ch;width:7ch\9;display:inline-block}.flatpickr-current-month .numInputWrapper span.arrowUp:after{border-bottom-color:rgba(0,0,0,.9)}.flatpickr-current-month .numInputWrapper span.arrowDown:after{border-top-color:rgba(0,0,0,.9)}.flatpickr-current-month input.cur-year{background:0 0;box-sizing:border-box;color:inherit;cursor:default;padding:0 0 0 .5ch;margin:0;display:inline;font-size:inherit;font-family:inherit;font-weight:300;line-height:inherit;height:initial;border:0;border-radius:0;vertical-align:initial}.flatpickr-current-month input.cur-year:focus{outline:0}.flatpickr-current-month input.cur-year[disabled],.flatpickr-current-month input.cur-year[disabled]:hover{font-size:100%;color:rgba(0,0,0,.5);background:0 0;pointer-events:none}.flatpickr-weekdays{background:0 0;text-align:center;overflow:hidden}.flatpickr-days,.flatpickr-weeks{padding:1px 0 0 0}.flatpickr-days{padding:0;outline:0;text-align:left;width:315px;box-sizing:border-box;display:inline-block;display:-ms-flexbox;display:flex;flex-wrap:wrap;-ms-flex-wrap:wrap;-ms-flex-pack:justify;justify-content:space-around}.flatpickr-day{background:0 0;border:1px solid transparent;border-radius:150px;box-sizing:border-box;color:#393939;cursor:pointer;font-weight:400;width:14.2857143%;flex-basis:14.2857143%;max-width:40px;height:40px;line-height:40px;margin:0;display:inline-block;position:relative;justify-content:center;text-align:center}.flatpickr-day.inRange,.flatpickr-day.nextMonthDay.inRange,.flatpickr-day.nextMonthDay.today.inRange,.flatpickr-day.nextMonthDay:focus,.flatpickr-day.nextMonthDay:hover,.flatpickr-day.prevMonthDay.inRange,.flatpickr-day.prevMonthDay.today.inRange,.flatpickr-day.prevMonthDay:focus,.flatpickr-day.prevMonthDay:hover,.flatpickr-day.today.inRange,.flatpickr-day:focus,.flatpickr-day:hover{cursor:pointer;outline:0;background:#e6e6e6;border-color:#e6e6e6}.flatpickr-day.today{border-color:#959ea9}.flatpickr-day.today:focus,.flatpickr-day.today:hover{border-color:#959ea9;background:#959ea9;color:#fff}.flatpickr-day.endRange,.flatpickr-day.endRange.nextMonthDay,.flatpickr-day.endRange.prevMonthDay,.flatpickr-day.endRange:focus,.flatpickr-day.endRange:hover,.flatpickr-day.selected,.flatpickr-day.selected.nextMonthDay,.flatpickr-day.selected.prevMonthDay,.flatpickr-day.selected:focus,.flatpickr-day.selected:hover,.flatpickr-day.startRange,.flatpickr-day.startRange.nextMonthDay,.flatpickr-day.startRange.prevMonthDay,.flatpickr-day.startRange:focus,.flatpickr-day.startRange:hover{background:#569ff7;color:#fff;border-color:#569ff7}.flatpickr-day.endRange.startRange,.flatpickr-day.selected.startRange,.flatpickr-day.startRange.startRange{border-radius:50px 0 0 50px}.flatpickr-day.endRange.endRange,.flatpickr-day.selected.endRange,.flatpickr-day.startRange.endRange{border-radius:0 50px 50px 0}.flatpickr-day.endRange.startRange.endRange,.flatpickr-day.selected.startRange.endRange,.flatpickr-day.startRange.startRange.endRange{border-radius:50px}.flatpickr-day.inRange{border-radius:0;box-shadow:-5px 0 0 #e6e6e6,5px 0 0 #e6e6e6}.flatpickr-day.disabled,.flatpickr-day.disabled:hover{pointer-events:none}.flatpickr-day.disabled,.flatpickr-day.disabled:hover,.flatpickr-day.nextMonthDay,.flatpickr-day.notAllowed,.flatpickr-day.notAllowed.nextMonthDay,.flatpickr-day.notAllowed.prevMonthDay,.flatpickr-day.prevMonthDay{color:rgba(57,57,57,.3);background:0 0;border-color:transparent;cursor:default}span.flatpickr-weekday{cursor:default;font-size:90%;color:rgba(0,0,0,.54);height:27.333333333333332px;line-height:24px;margin:0;background:0 0;text-align:center;display:block;float:left;width:14.28%;font-weight:700;margin:0;padding-top:3.333333333333333px}.rangeMode .flatpickr-day{margin-top:1px}.flatpickr-weekwrapper{display:inline-block;float:left}.flatpickr-weekwrapper .flatpickr-weeks{padding:1px 12px 0 12px;box-shadow:1px 0 0 #e6e6e6}.flatpickr-weekwrapper .flatpickr-weekday{float:none;width:100%}.flatpickr-weekwrapper span.flatpickr-day{display:block;width:100%;max-width:none}.flatpickr-innerContainer{display:block;display:flex;box-sizing:border-box;overflow:hidden}.flatpickr-rContainer{display:inline-block;padding:0;box-sizing:border-box}.flatpickr-time{text-align:center;outline:0;display:block;height:0;line-height:40px;max-height:40px;box-sizing:border-box;overflow:hidden;transition:height .33s cubic-bezier(0,1,.5,1);display:flex}.flatpickr-time:after{content:"";display:table;clear:both}.flatpickr-time .numInputWrapper{flex:1;width:40%;height:40px;float:left}.flatpickr-time .numInputWrapper span.arrowUp:after{border-bottom-color:#393939}.flatpickr-time .numInputWrapper span.arrowDown:after{border-top-color:#393939}.flatpickr-time.hasSeconds .numInputWrapper{width:26%}.flatpickr-time.time24hr .numInputWrapper{width:49%}.flatpickr-time input{background:0 0;box-shadow:none;border:0;border-radius:0;text-align:center;margin:0;padding:0;height:inherit;line-height:inherit;cursor:pointer;color:#393939;font-size:14px;position:relative;box-sizing:border-box}.flatpickr-time input.flatpickr-hour{font-weight:700}.flatpickr-time input.flatpickr-minute,.flatpickr-time input.flatpickr-second{font-weight:400}.flatpickr-time input:focus{outline:0;border:0}.flatpickr-time .flatpickr-am-pm,.flatpickr-time .flatpickr-time-separator{height:inherit;display:inline-block;float:left;line-height:inherit;color:#393939;font-weight:700;width:2%;user-select:none}.flatpickr-time .flatpickr-am-pm{outline:0;width:18%;cursor:pointer;text-align:center;font-weight:400}.flatpickr-time .flatpickr-am-pm:focus,.flatpickr-time .flatpickr-am-pm:hover{background:#f0f0f0}.hasTime .flatpickr-days,.hasWeeks .flatpickr-days{border-bottom:0;border-bottom-right-radius:0;border-bottom-left-radius:0}.hasWeeks .flatpickr-days{border-left:0}@media all and (-ms-high-contrast:none){.flatpickr-month{padding:0}.flatpickr-month svg{top:0!important}}.flatpickr-input[readonly]{cursor:pointer}@-moz-keyframes flatpickrFadeInDown{from{opacity:0;transform:translate3d(0,-20px,0)}to{opacity:1;transform:none}}@-webkit-keyframes flatpickrFadeInDown{from{opacity:0;transform:translate3d(0,-20px,0)}to{opacity:1;transform:none}}@-o-keyframes flatpickrFadeInDown{from{opacity:0;transform:translate3d(0,-20px,0)}to{opacity:1;transform:none}}@keyframes flatpickrFadeInDown{from{opacity:0;transform:translate3d(0,-20px,0)}to{opacity:1;transform:none}}.choices{position:relative;margin-bottom:24px;font-size:16px}.choices:focus{outline:0}.choices:last-child{margin-bottom:0}.choices.is-disabled .choices__inner,.choices.is-disabled .choices__input{background-color:#eaeaea;cursor:not-allowed;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.choices.is-disabled .choices__item{cursor:not-allowed}.choices[data-type*=select-one]{cursor:pointer}.choices[data-type*=select-one] .choices__inner{padding-bottom:7.5px}.choices[data-type*=select-one] .choices__input{display:block;width:100%;padding:10px;border-bottom:1px solid #ddd;background-color:#fff;margin:0}.choices[data-type*=select-one] .choices__button{background-image:url(node_modules/formiojs/dist/icons/cross-inverse.svg);padding:0;background-size:8px;position:absolute;top:50%;right:0;margin-top:-10px;margin-right:25px;height:20px;width:20px;border-radius:10em;opacity:.5}.choices[data-type*=select-one] .choices__button:focus,.choices[data-type*=select-one] .choices__button:hover{opacity:1}.choices[data-type*=select-one] .choices__button:focus{box-shadow:0 0 0 2px #00bcd4}.choices[data-type*=select-one]:after{content:"";height:0;width:0;border-style:solid;border-color:#333 transparent transparent transparent;border-width:5px;position:absolute;right:11.5px;top:50%;margin-top:-2.5px;pointer-events:none}.choices[data-type*=select-one].is-open:after{border-color:transparent transparent #333 transparent;margin-top:-7.5px}.choices[data-type*=select-one][dir=rtl]:after{left:11.5px;right:auto}.choices[data-type*=select-one][dir=rtl] .choices__button{right:auto;left:0;margin-left:25px;margin-right:0}.choices[data-type*=select-multiple] .choices__inner,.choices[data-type*=text] .choices__inner{cursor:text}.choices[data-type*=select-multiple] .choices__button,.choices[data-type*=text] .choices__button{position:relative;display:inline-block;margin:0 -4px 0 8px;padding-left:16px;border-left:1px solid #008fa1;background-image:url(node_modules/formiojs/dist/icons/cross.svg);background-size:8px;width:8px;line-height:1;opacity:.75}.choices[data-type*=select-multiple] .choices__button:focus,.choices[data-type*=select-multiple] .choices__button:hover,.choices[data-type*=text] .choices__button:focus,.choices[data-type*=text] .choices__button:hover{opacity:1}.choices__inner{display:inline-block;vertical-align:top;width:100%;background-color:#f9f9f9;padding:7.5px 7.5px 3.75px;border:1px solid #ddd;border-radius:2.5px;font-size:14px;min-height:44px;overflow:hidden}.is-focused .choices__inner,.is-open .choices__inner{border-color:#b7b7b7}.is-open .choices__inner{border-radius:2.5px 2.5px 0 0}.is-flipped.is-open .choices__inner{border-radius:0 0 2.5px 2.5px}.choices__list{margin:0;padding-left:0;list-style:none}.choices__list--single{display:inline-block;padding:4px 16px 4px 4px;width:100%}[dir=rtl] .choices__list--single{padding-right:4px;padding-left:16px}.choices__list--single .choices__item{width:100%}.choices__list--multiple{display:inline}.choices__list--multiple .choices__item{display:inline-block;vertical-align:middle;border-radius:20px;padding:4px 10px;font-size:12px;font-weight:500;margin-right:3.75px;margin-bottom:3.75px;background-color:#00bcd4;border:1px solid #00a5bb;color:#fff;word-break:break-all}.choices__list--multiple .choices__item[data-deletable]{padding-right:5px}[dir=rtl] .choices__list--multiple .choices__item{margin-right:0;margin-left:3.75px}.choices__list--multiple .choices__item.is-highlighted{background-color:#00a5bb;border:1px solid #008fa1}.is-disabled .choices__list--multiple .choices__item{background-color:#aaa;border:1px solid #919191}.choices__list--dropdown{display:none;z-index:1;position:absolute;width:100%;background-color:#fff;border:1px solid #ddd;top:100%;margin-top:-1px;border-bottom-left-radius:2.5px;border-bottom-right-radius:2.5px;overflow:hidden;word-break:break-all}.choices__list--dropdown.is-active{display:block}.is-open .choices__list--dropdown{border-color:#b7b7b7}.is-flipped .choices__list--dropdown{top:auto;bottom:100%;margin-top:0;margin-bottom:-1px;border-radius:.25rem .25rem 0 0}.choices__list--dropdown .choices__list{position:relative;max-height:300px;overflow:auto;-webkit-overflow-scrolling:touch;will-change:scroll-position}.choices__list--dropdown .choices__item{position:relative;padding:10px;font-size:14px}[dir=rtl] .choices__list--dropdown .choices__item{text-align:right}@media (min-width:640px){.choices__list--dropdown .choices__item--selectable{padding-right:100px}.choices__list--dropdown .choices__item--selectable:after{content:attr(data-select-text);font-size:12px;opacity:0;position:absolute;right:10px;top:50%;-webkit-transform:translateY(-50%);transform:translateY(-50%)}[dir=rtl] .choices__list--dropdown .choices__item--selectable{text-align:right;padding-left:100px;padding-right:10px}[dir=rtl] .choices__list--dropdown .choices__item--selectable:after{right:auto;left:10px}}.choices__list--dropdown .choices__item--selectable.is-highlighted{background-color:#f2f2f2}.choices__list--dropdown .choices__item--selectable.is-highlighted:after{opacity:.5}.choices__item{cursor:default}.choices__item--selectable{cursor:pointer}.choices__item--disabled{cursor:not-allowed;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;opacity:.5}.choices__heading{font-weight:600;font-size:12px;padding:10px;border-bottom:1px solid #f7f7f7;color:gray}.choices__button{text-indent:-9999px;-webkit-appearance:none;-moz-appearance:none;appearance:none;border:0;background-color:transparent;background-repeat:no-repeat;background-position:center;cursor:pointer}.choices__button:focus{outline:0}.choices__input{display:inline-block;vertical-align:baseline;background-color:#f9f9f9;font-size:14px;margin-bottom:5px;border:0;border-radius:0;max-width:100%;padding:4px 0 4px 2px}.choices__input:focus{outline:0}[dir=rtl] .choices__input{padding-right:2px;padding-left:0}.choices__placeholder{opacity:.5}.form-group.required .control-label:after{content:" *";color:red}.glyphicon-spin{-webkit-animation:formio-spin 1s infinite linear;-moz-animation:formio-spin 1s infinite linear;-o-animation:formio-spin 1s infinite linear;animation:formio-spin 1s infinite linear}@-moz-keyframes formio-spin{from{-moz-transform:rotate(0)}to{-moz-transform:rotate(360deg)}}@-webkit-keyframes formio-spin{from{-webkit-transform:rotate(0)}to{-webkit-transform:rotate(360deg)}}@keyframes formio-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}.button-icon-right{margin-left:5px}.form-control.flatpickr-input{background-color:#fff}td>.form-group{margin-bottom:0}.signature-pad{position:relative}.signature-pad-canvas{border-radius:4px;box-shadow:0 0 5px rgba(0,0,0,.02) inset;border:1px solid #f4f4f4}.btn.signature-pad-refresh{position:absolute;left:0;top:0;z-index:1000;padding:3px;line-height:0}.signature-pad-refresh img{height:1.2em}.signature-pad-footer{text-align:center;color:#c3c3c3}.loader-wrapper{z-index:1000;position:absolute;top:0;left:0;bottom:0;right:0;background-color:rgba(0,0,0,.1)}.loader{position:absolute;left:50%;top:50%;margin-left:-30px;margin-top:-30px;z-index:10000;display:inline-block;border:6px solid #f3f3f3;border-top:6px solid #3498db;border-radius:50%;width:60px;height:60px;animation:spin 2s linear infinite}@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}.choices__list--dropdown{z-index:100}.choices__list--multiple .choices__item{border-radius:0;padding:2px 8px;line-height:1em;margin-bottom:6px}.choices__list--single{padding:0}.choices__input{padding:2px}'],
        encapsulation: core_1.ViewEncapsulation.None
    }),
    __metadata("design:paramtypes", [formio_config_1.FormioAppConfig,
        core_1.ElementRef,
        formio_loader_1.FormioLoader,
        formio_alerts_1.FormioAlerts])
], FormioComponent);
exports.FormioComponent = FormioComponent;
