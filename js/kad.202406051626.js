$(function () {
	let ModalLogon = function () {
			let isOldIE = $.browser.msie && parseInt($.browser.version, 10) < 9;

			if (!isOldIE) {
				this.redirectUrl = '';
				this.esiaRedirectAddress = '';
				this.template = $('#modal_logon').html();
				this.partials = {};
				this.isNoToggle = false;
				this.isEsiaRequired = false;
				this.defaultMode = 'esia';
				this.mode = this.defaultMode;
				this.prevMode = null;
				this.inputNamesMap = null;
				this._req = {};

				this.validateRules = {
					logOn: {
						UserName: {
							rules: ['required', 'encoded_uri_email'],
							message: 'Нужно указать корректный адрес электронной почты'
						},
						Password: {
							rules: ['required'],
							message: 'Пароль не может быть пустым'
						}
					},
					restorePassword: {
						Email: {
							rules: ['required', 'email'],
							message: 'Нужно указать корректный адрес электронной почты'
						}
					},
					linkEsiaAccount: {
						Email: {
							rules: ['required', 'email'],
							message: 'Нужно указать корректный адрес электронной почты'
						}
					},
					registerUser: {
						FirstName: {
							rules: ['required'],
							message: 'Укажите имя'
						},
						LastName: {
							rules: ['required'],
							message: 'Укажите фамилию'
						},
						UserName: {
							rules: ['required', 'email'],
							message: 'Укажите корректный адрес электронной почты'
						},
						Phone: {
							rules: ['required'],
							message: 'Укажите номер мобильного телефона'
						},
						Password: {
							rules: ['required'],
							message: 'Укажите пароль'
						},
						ConfirmPassword: {
							rules: ['confirm_password']
						}
					}
				};

				this.validators = {
					required: function(value) {
						return {
							status: !!$.trim(value),
							message: 'Поле не должно быть пустым'
						}
					},
					email: function(value) {
						return {
							status: !value || /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/.test(value.toLowerCase()),
							message: 'Некорректный email'
						}
					},
					encoded_uri_email: function (value) {
						return this.email(decodeURIComponent(value));
					},
					confirm_password: function (value, data) {
						let status = true;
							message = null;

						if (data.Password) {
							status = !!data.ConfirmPassword;

							if (status) {
								status = data.Password === data.ConfirmPassword;

								if (!status) {
									message = 'Пароли не совпадают';
								}
							} else {
								message = 'Повторно введите пароль';
							}
						}

						return {
							status: status,
							message: message
						};
					},
				};

				this.initialize();
			}
		};

	ModalLogon.prototype.delegateEvents = function () {
		this.$el
			.delegate('.js-modal_logon-prevent_event', 'click keyup keydown', this.preventEvent)
			.delegate('.js-popup-close', 'click', this.hide.bind(this))
			.delegate('.js-modal_logon-mode-toggler', 'click', this.toggleMode.bind(this))
			.delegate('.js-modal_logon-form-input_placeholder', 'click', this.clickInputPlaceholder)
			.delegate('.js-modal_logon-form-input', 'change', this.togglePlaceholder.bind(this))
			.delegate('.js-modal_logon-form-input', 'focus', this.focusInput)
			.delegate('.js-modal_logon-form-input', 'blur', this.blurInput.bind(this))
			.delegate('.js-modal_logon-form-input', 'keyup', this.keyupInput.bind(this))
			.delegate('.js-modal_logon-logon', 'click', this.logOn.bind(this))
			.delegate('.js-modal_logon-registeruser', 'click', this.registerUser.bind(this))
			.delegate('.js-modal_logon-restorepassword', 'click', this.restorePassword.bind(this))
			.delegate('.js-modal_logon-linkesiaaccount', 'click', this.linkEsiaAccount.bind(this))
			.delegate('.js-modal_logon-openauthpage', 'click', this.openAuthPageByButton.bind(this))
			.delegate('.js-modal_logon-logon_form', 'submit', this.preventEvent)
			.delegate('.js-modal_logon-restorepassword_form, .js-modal_logon-linkesiaaccount_form', 'submit', this.preventEvent)
			.delegate('input[name="RememberMe"]', 'change', this.toggleRememberMeCheckbox.bind(this))
			.delegate('input[name="IAgree"]', 'change', this.toggleIAgreeCheckbox.bind(this))
			.delegate('.js-modal_logon-esia', 'click', function () {
				this.setIAgreeFlag();
				this.saveSearchParams();
			}.bind(this));
	};

	ModalLogon.prototype.initialize = function () {
		let isAuth = !$('.js-arbitr-header-auth-name').length && (Common.getUrlParam('auth') === 'true'),
			returnUrlString = (Common.getUrlParam('returnUrl') || Common.getUrlParam('ReturnUrl')) + location.hash;

		this.isIframe = window.self !== window.top;

		if (isAuth) {
			setTimeout(function () {
				this.show({
					mode: this.isIframe ? 'openauthpage' : this.defaultMode,
					esiaRedirectAddress: returnUrlString,
					redirectUrl: returnUrlString
				});
			}.bind(this), 0);
		} else if (returnUrlString) {
			location.href = returnUrlString;
		}

		$('.js-sj_auth').bind('click', function () {
			return this.show();
		}.bind(this));

		$('.js-sj_logout').bind('click', function (e) {
			return this.openLogOffPage(e.currentTarget.href);
		}.bind(this));

		this.$el = $('<div class="b-modal">');

		this.$modal = $('<div class="b-modal_wrapper">');

		this.$modal.appendTo('body');
	};

	ModalLogon.prototype.render = function (params) {
		this.$el.html(this.template);

		this.partials.modeBlocks = {};
		this.partials.modeBlocks.$logonBlocks = this.$el.find('.js-mode--logon');
		this.partials.modeBlocks.$registeruserBlocks = this.$el.find('.js-mode--registeruser');
		this.partials.modeBlocks.$esiaBlocks = this.$el.find('.js-mode--esia');
		this.partials.modeBlocks.$restorepasswordBlocks = this.$el.find('.js-mode--restorepassword');
		this.partials.modeBlocks.$linkesiaaccountBlocks = this.$el.find('.js-mode--linkesiaaccount');
		this.partials.modeBlocks.$openauthpageBlocks = this.$el.find('.js-mode--openauthpage');
		this.partials.$logonForm = this.$el.find('.js-modal_logon-logon_form');
		this.partials.$registeruserForm = this.$el.find('.js-modal_logon-registeruser_form');
		this.partials.$restorepasswordForm = this.$el.find('.js-modal_logon-restorepassword_form');
		this.partials.$linkesiaaccountForm = this.$el.find('.js-modal_logon-linkesiaaccount_form');
		this.partials.$esiaLink = this.$el.find('.js-modal_logon-esia');
		this.partials.$backModeToggler = this.$el.find('.js-modal_logon-mode-toggler--back');

		this.initInputNamesMap();
	
		if ($.cookie('is_agree_privacy_policy')) {
			this.$el.find('input[name="IAgree"]').attr('checked', true);
			$.cookie('is_agree_privacy_policy', null);
		}

		this.toggleIAgreeCheckbox();

		let phoneMask = '+7 999 999-99-99';

		$('.js-modal_logon-form-input--phone', this.$el)
			.attr('data-mask', phoneMask)
			.mask(phoneMask);

		this.toggleMode(params.mode || this.mode);

		this.$el.appendTo(this.$modal);

		this.delegateEvents();
	};

	ModalLogon.prototype.remove = function () {
		this.$el.remove();
	};

	ModalLogon.prototype.show = function (params) {
		params = params || {};

		if (this.isIframe && ['openauthpage', 'restorepassword'].indexOf(params.mode) === -1) {
			this.saveSearchParams();

			this.openAuthPage({
				params: JSON.stringify(params),
				isEsia: (params.isNoToggle || params.isEsiaRequired) && (!params.mode || params.mode === 'esia')
			});

			return false;
		}

		this.isBlocker = !!params.isBlocker;
		this.isPopup = !!params.isPopup;
		this.isNoToggle = !!params.isNoToggle;
		this.isEsiaRequired = !!params.isEsiaRequired;
		this.esiaRedirectAddress = encodeURIComponent(params.esiaRedirectAddress ?
								   params.esiaRedirectAddress : 
								   location.pathname + location.search + location.hash);

		if (this.esiaRedirectAddress) {
			this.esiaRedirectAddress = 'redirectTo=' + this.esiaRedirectAddress;
		}

		this.redirectUrl = params.redirectUrl || '';

		this.$modal.hide();

		this.render(params);

		if (this.isEsiaRequired) {
			this.$el.find('.js-modal_logon-mode').text('Функция доступна только при входе через портал Госуслуг');
		} else if (this.isNoToggle) {
			this.$el.find('.js-modal_logon-mode').remove();
		}

		if (this.esiaRedirectAddress) {
			this.partials.$esiaLink.attr('href', this.partials.$esiaLink.attr('href') + '?' + this.esiaRedirectAddress);
		}

		this.$modal.show();

		if (this.isBlocker) {
			this.$el.find('.js-popup-close').remove();
		} else {
			this.toggleEscListener(true);
		}

		return false;
	};

	ModalLogon.prototype.openAuthPage = function (params) {
		let width = Math.min(800, screen.availWidth),
			height = Math.min(800, screen.availHeight),
			left = (screen.width - width) / 2,
			top = (screen.height - height) / 2,
			paramsString = '';

		if (Object.keys(params || {}).length) {
			paramsString = '?';

			for (let key in params) {
				paramsString += key + '=' + encodeURIComponent(params[key]) + '&';
			}

			paramsString = paramsString.substring(0, paramsString.length - 1);
		}

		window.open(location.origin + '/Kad/Auth' + paramsString, null, `popup=true,width=${width},height=${height},top=${top},left=${left}`);
	};

	ModalLogon.prototype.openAuthPageByButton = function () {
		let params = {
				isBlocker: this.isBlocker,
				isNoToggle: this.isNoToggle,
				isEsiaRequired: this.isEsiaRequired,
				esiaRedirectAddress: this.esiaRedirectAddress,
				redirectUrl: this.redirectUrl
			};

		this.openAuthPage({
			params: JSON.stringify(params),
			isEsia: params.isNoToggle || params.isEsiaRequired
		});

		return false;
	};

	ModalLogon.prototype.hide = function () {
		this.remove();

		this.mode = this.defaultMode;
		this.prevMode = null;

		this.$modal.hide();
		this.toggleEscListener();

		return false;
	};

	ModalLogon.prototype.toggleEscListener = function (on) {
		$($.browser.msie ? 'body' : window)[on ? 'bind' : 'unbind']('keyup.modal_logon_esc_close', on && function(event) {
			if (event && event.keyCode == 27) {
				let logOnRequest = this._req && this._req.logOn,
					restorePasswordRequest = this._req && this._req.restorePassword,
					linkEsiaAccountRequest = this._req && this._req.linkEsiaAccount,
					registerUserRequest = this._req && this._req.registerUser;

				if (!logOnRequest || !logOnRequest.readyState || logOnRequest.readyState === 4) {
					if (!restorePasswordRequest || !restorePasswordRequest.readyState || restorePasswordRequest.readyState === 4) {
						if (!linkEsiaAccountRequest || !linkEsiaAccountRequest.readyState || linkEsiaAccountRequest.readyState === 4) {
							if (!registerUserRequest || !registerUserRequest.readyState || registerUserRequest.readyState === 4) {
								this.hide();
							}
						}
					}
				}
			}
		}.bind(this));
	};

	ModalLogon.prototype.toggleMode = function (e) {
		let mode = typeof e === 'string' ? e : e.currentTarget.getAttribute('href'),
			$selectingModeBlocks = this.partials.modeBlocks['$' + mode + 'Blocks'];

		for (let key in this.partials.modeBlocks) {
			if (this.partials.modeBlocks.hasOwnProperty(key)) {
				this.partials.modeBlocks[key].addClass('g-hidden');
			}
		}

		this.prevMode = this.mode;
		this.mode = mode;

		$selectingModeBlocks.removeClass('g-hidden');

		let $firstTextInput = $selectingModeBlocks.find('input[type="text"]:first');

		if ($firstTextInput.length) {
			$firstTextInput.focus();
		}

		this.$el[0].className = 'b-modal b-modal--' + this.mode;

		this.partials.$backModeToggler.attr('href', this.prevMode);

		return false;
	};

	ModalLogon.prototype.clickInputPlaceholder = function (e) {
		let $placeholder = $(e.currentTarget),
			$wrapper = $placeholder.parent(),
			$input = $wrapper.find('.js-modal_logon-form-input'),
			$label = $wrapper.find('.js-modal_logon-form-label');

		$placeholder.addClass('g-hidden');
		$label.removeClass('g-hidden');
		$input.focus();
	};

	ModalLogon.prototype.focusInput = function (e) {
		let $input = $(e.currentTarget),
			$wrapper = $input.parent(),
			$placeholder = $wrapper.find('.js-modal_logon-form-input_placeholder'),
			$error = $wrapper.find('.js-modal_logon-form-input_error'),
			$label;

		if (!$placeholder.hasClass('g-hidden')) {
			$label = $wrapper.find('.js-modal_logon-form-label');

			$placeholder.addClass('g-hidden');
			$label.removeClass('g-hidden');
		}

		if (!$error.hasClass('g-hidden')) {
			$error.addClass('g-hidden');
		}
	};

	ModalLogon.prototype.blurInput = function (e) {
		if (e.currentTarget.getAttribute('data-mask')) {
			setTimeout(function () {
				this._blurInput(e);
			}.bind(this));
		} else {
			this._blurInput(e);
		}
	};

	ModalLogon.prototype._blurInput = function (e) {
		let $input = $(e.currentTarget),
			$wrapper = $input.parent(),
			$error = $wrapper.find('.js-modal_logon-form-input_error'),
			$placeholder, $label;

		if (!$input.val()) {
			$placeholder = $wrapper.find('.js-modal_logon-form-input_placeholder');
			$label = $wrapper.find('.js-modal_logon-form-label');

			$label.addClass('g-hidden');
			$placeholder.removeClass('g-hidden');
		}

		if (!$error.hasClass('g-hidden')) {
			$error.addClass('g-hidden');
		}
	};

	ModalLogon.prototype.togglePlaceholder = function (e) {
		this.focusInput(e);
		this.blurInput(e);
	};

	ModalLogon.prototype.keyupInput = function (e) {
		if (e.which === 13) {
			let $form = $(e.currentTarget).closest('form');

			switch ($form[0]) {
				case this.partials.$logonForm[0]:
					this.logOn(e);
					break;
				case this.partials.$registeruserForm[0]:
					this.registerUser(e);
					break;
				case this.partials.$restorepasswordForm[0]:
					this.restorePassword(e);
					break;
				case this.partials.$linkesiaaccountForm[0]:
					this.linkEsiaAccount(e);
					break;
			}
		}
	};

	ModalLogon.prototype.logOn = function (e) {
		let request = this._req.logOn;

		if (!request || !request.readyState || request.readyState === 4) {
			let isAgreed = this.$el.find('input[name="IAgree"]').is(':checked');

			if (isAgreed) {
				let $button = e.currentTarget.tagName === 'A' ? $(e.currentTarget) : this.$el.find('.js-modal_logon-logon'),
					params = this.toObject(this.partials.$logonForm.serializeArray());

				for (let key in params) {
					if (params.hasOwnProperty(key)) {
						params[key] = encodeURIComponent(params[key]);
					}
				}

				params.RememberMe = this.$el.find('input[name="RememberMe"]').is(':checked');
				params.SystemName = 'sps';

				if (this.validate(params, 'logOn')) {
					this.setIAgreeFlag();
					this.saveSearchParams();

					showLoader(true);

					this._req.logOn = $.ajax({
						url: config.services.logOn,
						data: params,
						type: 'post',
						dataType: 'json',
						success: function (data) {
							if (data.Success) {
								let locationReload = function() {
									if (this.redirectUrl) {
										location.href = this.redirectUrl;
									}

									location.reload();
								}.bind(this);

								if (e.currentTarget.tagName === 'INPUT') {
									$(e.currentTarget).blur();
								}

								$button
									.addClass('g-hidden')
									.parent()
									.find('.js-modal_logon-logon_autorization')
									.removeClass('g-hidden')
									.find('.js-modal_logon-button-handler-spiner')
									.spin('toggler', '#99a8bf');

								if (this.isPopup) {
									if (window.opener) {
										window.opener.focus();

										if (this.redirectUrl) {
											window.opener.location.href = this.redirectUrl;
										}

										window.opener.location.reload();
									}

									window.close();
								} else if ($('.js-sj_auth').length) {
									locationReload();
								} else {
									if ($('#userExternalId').val() == data.Result.ExternalId) {
										this.hide();
										$('.b-sj_auth').removeClass('g-hidden');
									} else {
										locationReload();
									}
								}
							} else {
								hideLoader();

								this.showErrorMessages({
									messages: [data.Message]
								}, 'logOn');
							}
						}.bind(this),
						error: function () {
							hideLoader();

							let message = '';

							try {
								message = JSON.parse(xhr.responseText).Message;
							} catch (e) {}

							this.showErrorMessages({
								messages: [message]
							}, 'logOn');
						}
					});
				}
			}
		}

		return false;
	};

	ModalLogon.prototype.logOff = function () {
		$.ajax({
			url: config.services.logOff,
			type: 'post',
			dataType: 'json',
			success: function(data) {
				let result = data.Result;

				if (result.IsESIA) {
					location.href = result.Url;
				} else {
					if ((location.pathname + location.search) === result.Url) {
						location.reload();
					} else {
						location.href = result.Url;
					}
				}
			}
		});
	};

	ModalLogon.prototype.openLogOffPage = function (href) {
		if (this.isIframe) {
			let width = Math.min(800, screen.availWidth),
				height = Math.min(800, screen.availHeight),
				left = (screen.width - width) / 2,
				top = (screen.height - height) / 2;

			window.open(location.origin + '/Kad/LogOffPage' + '?href=' + encodeURIComponent(href.split('?')[0]), null, `popup=true,width=${width},height=${height},top=${top},left=${left}`);

			return false;
		}
	};

	ModalLogon.prototype.registerUser = function (e) {
		let request = this._req.registerUser;

		if (!request || !request.readyState || request.readyState === 4) {
			let isAgreed = this.$el.find('input[name="IAgree"]').is(':checked');

			if (isAgreed) {
				let params = this.toObject(this.partials.$registeruserForm.serializeArray()),
					mappedParams = {};

				for (let key in params) {
					if (params.hasOwnProperty(key)) {
						// params[key] = encodeURIComponent(params[key]);

						mappedParams[this.inputNamesMap[key] || key] = params[key];
					}
				}

				params = mappedParams;

				params.SystemName = 'sps';

				if (this.validate(params, 'registerUser')) {
					this.setIAgreeFlag();
					this.saveSearchParams();

					showLoader(true);

					this._req.logOn = $.ajax({
						url: config.services.registerUser,
						data: params,
						type: 'post',
						dataType: 'json',
						success: function (data) {
							if (data.Success) {
								this.hide();

								this.successForm = this.successForm || new this.constructor.SuccessForm;

								let locationReload = function () {
										if (this.isPopup) {
											if (window.opener) {
												window.opener.focus();

												if (this.redirectUrl) {
													window.opener.location.href = this.redirectUrl;
												} else {
													window.opener.location.reload();
												}
											}

											window.close();
										} else if (this.redirectUrl) {
											location.href = decodeURIComponent(this.redirectUrl);
										} else {
											location.reload();
										}
									}.bind(this);

								this.successForm.show('Инструкция по&nbsp;активации учетной записи отправлена на&nbsp;адрес Вашей&nbsp;электронной&nbsp;почты', {
									afterShowCallback: function () {
										setTimeout(locationReload, 10000);
									}.bind(this),
									afterHideCallback: locationReload
								});
							} else {
								this.showErrorMessages({
									messages: [data.Message]
								}, 'registerUser');
							}
						}.bind(this),
						error: function () {
							let message = '';

							try {
								message = JSON.parse(xhr.responseText).Message;
							} catch (e) {}

							this.showErrorMessages({
								messages: [message]
							}, 'registerUser');
						},
						complete: hideLoader
					});
				}
			}
		}

		return false;
	};

	ModalLogon.prototype.restorePassword = function (e) {
		let request = this._req.restorePassword;

		if (!request || !request.readyState || request.readyState === 4) {
			let params = this.toObject(this.partials.$restorepasswordForm.serializeArray());

			if (this.validate(params, 'restorePassword')) {
				showLoader(true);

				this._req.restorePassword = $.ajax({
					url: config.services.remindPassword,
					data: params,
					type: 'post',
					dataType: 'json',
					success: function (data) {
						if (data.Success) {
							let prevMode = this.prevMode;

							this.hide();

							this.successForm = this.successForm || new this.constructor.SuccessForm;

							this.successForm.show(data.Result, {
								afterHideCallback: function () {
									if (this.isBlocker) {
										this.show({
											isBlocker: this.isBlocker,
											mode: prevMode
										});
									}
								}.bind(this)
							});
						} else {
							this.showErrorMessages({
								messages: [data.Message]
							}, 'restorePassword');
						}
					}.bind(this),
					error: function (xhr) {
						let message = '';

						try {
							message = JSON.parse(xhr.responseText).Message;
						} catch (e) {
							message = xhr.responseText;
						}

						this.showErrorMessages({
							messages: [message]
						}, 'restorePassword');
					}.bind(this),
					complete: hideLoader
				});
			}
		}

		return false;
	};

	ModalLogon.prototype.linkEsiaAccount = function (e) {
		let request = this._req.linkEsiaAccount;

		if (!request || !request.readyState || request.readyState === 4) {
			let params = this.toObject(this.partials.$linkesiaaccountForm.serializeArray());

			if (this.validate(params, 'linkEsiaAccount')) {
				showLoader(true);

				this._req.linkEsiaAccount = $.ajax({
					url: config.services.linkEsiaAccount,
					data: params,
					type: 'post',
					dataType: 'json',
					success: function (data) {
						if (data.Success) {
							this.hide();

							this.successForm = this.successForm || new this.constructor.SuccessForm;

							this.successForm.show(data.Result);
						} else {
							this.showErrorMessages({
								messages: [data.Message]
							}, 'linkEsiaAccount');
						}
					}.bind(this),
					error: function (xhr) {
						let message = '';

						try {
							message = JSON.parse(xhr.responseText).Message;
						} catch (e) {
							message = xhr.responseText;
						}

						this.showErrorMessages({
							messages: [message]
						}, 'linkEsiaAccount');
					}.bind(this),
					complete: hideLoader
				});
			}
		}

		return false;
	};

	ModalLogon.prototype.validate = function (data, action) {
		let serviceRules = this.validateRules[action],
			validationFails = false,
			validationMessages = [],
			validationFields = [],
			validationFieldsMessages = {};

		if (serviceRules) {
			let keys = (function () {
					let keys = [];

					for (let key in serviceRules) {
						if (serviceRules.hasOwnProperty(key)) {
							keys.push(key);
						}
					}

					return keys;
				})();

			for (let i = 0, imax = keys.length; i < imax; i++) {
				let name = keys[i],
					validator = serviceRules[name];

				if (validator) {
					for (let j = 0, jmax = validator.rules.length; j < jmax; j++) {
						let rule = validator.rules[j],
							namesArray = name.split('.'),
							dataValue = data[name];

						if (typeof dataValue !== 'undefined') {
							let result = this.validators[rule](dataValue, data);

							if (result.status) {
								if (result.value) {
									data[name] = result.value;
								}
							} else {
								let validatorMessage = validator.message || result.message;

								if (result.fields) {
									for (let k = 0, kmax = result.fields.length; k < kmax; k++) {
										validationFieldsMessages[result.fields[k]] = validatorMessage;
									}
								} else {
									validationFieldsMessages[name] = validatorMessage;
								}

								validationMessages.push(validatorMessage);

								result.fields = result.fields || [name];

								for (let k = 0, kmax = result.fields.length; k < kmax; k++) {
									validationFields.push(result.fields[k]);
								}

								validationFails = true;

								break;
							}
						}
					}
				}
			}
		}

		this.showErrorMessages({
			messages: validationMessages,
			fields: validationFields,
			fieldsMessages: validationFieldsMessages
		}, action);

		return !validationFails;
	};

	ModalLogon.prototype.showErrorMessages = function (errors, action) {
		if (action) {
			let $form = this.partials['$' + action.toLowerCase() + 'Form'];

			if ($form && $form.length) {
				$form.find('.js-modal_logon-form-input_error').addClass('g-hidden');

				if (errors) {
					if (errors.fields) {
						for (let i = 0, imax = errors.fields.length, item; i < imax; i++) {
							item = errors.fields[i];

							if (errors.fieldsMessages && errors.fieldsMessages[item]) {
								let $input = $form.find('[name="' + item + '"]');

								if (!$input.length) {
									$input = $form.find('[data-name="' + item + '"]');
								}

								$input
									.parent()
									.find('.js-modal_logon-form-input_error')
									.text(errors.fieldsMessages[item])
									.removeClass('g-hidden');
							}
						}
					} else if (errors.messages) {
						showPageMessage({
							type:'error',
							title:'Ошибка',
							message: errors.messages[0],
							right:20
						});
					}
				}
			}
		}
	};

	ModalLogon.prototype.preventEvent = function (e) {
		e.preventDefault();

		return false;
	};

	ModalLogon.prototype.toObject = function (arr) {
		let obj = {};

		for (let i = 0, imax = arr.length; i < imax; i++) {
			obj[arr[i].name] = arr[i].value;
		}

		return obj;
	};

	ModalLogon.prototype.saveSearchParams = function () {
		let $mainColumn = $('#main-column1');

		if ($mainColumn.length) {
			let $participantsWrappers = $mainColumn.find('#sug-participants .tag'),
				$judgesWrappers = $mainColumn.find('#sug-judges .tag'),
				$courtsWrappers = $mainColumn.find('#caseCourt .tag'),
				$casesWrappers = $mainColumn.find('#sug-cases .tag'),
				$datesWrapper = $mainColumn.find('#sug-dates'),
				$activeFilterCases = $('#filter-cases').find('li.active'),
				activeFilterclass = $activeFilterCases.length && $.trim($activeFilterCases.attr('class').replace('active', '')),
				searchParams = {
					'participants': [],
					'judges': [],
					'courts': [],
					'cases': [],
					'dates': {},
					'wasSearching': !($('.b-results').hasClass('g-hidden') && $('.b-noResults').hasClass('g-hidden')),
					'withVKSInstances': $('.vksCheckClass').attr('checked'),
					'activeFilter': activeFilterclass || null
				},
				modifySearchParamsArr = function(field) {
					let arr = searchParams[field];

					if ((arr.length > 1)) {
						let firsElem = arr.splice(0, 1);

						arr.push(firsElem[0]);
					}
				},
				getInputVal = function($input) {
					let value = $input.val(),
						placeholder =  $input.attr('placeholder');

					if (placeholder && (placeholder === value)) {
						value = '';
					}

					return value;
				};

			$.each($participantsWrappers, function(i, e) {
				let $participantWrapper = $(e),
					participantName = getInputVal($participantWrapper.find('textarea')),
					participantType = $participantWrapper.find('input[type="radio"]:checked').val();

				searchParams.participants.push({
					'Name': participantName || null,
					'Type': participantType
				});
			});

			modifySearchParamsArr('participants');

			$.each($judgesWrappers, function(i, e) {
				let $input = $(e).find('input[type="text"]');
				let judgeName = getInputVal($input);
				let judgeId = $input.attr('id');

				searchParams.judges.push({
					'Name': judgeName || null,
					'Id': judgeId || null
				});
			});

			modifySearchParamsArr('judges');

			$.each($courtsWrappers, function(i, e) {
				let courtName = getInputVal($(e).find('input[type="text"]'));

				searchParams.courts.push({
					'Name': courtName || null
				});
			});

			modifySearchParamsArr('courts');

			$.each($casesWrappers, function(i, e) {
				let caseNumber = getInputVal($(e).find('input[type="text"]'));

				searchParams.cases.push({
					'Number': caseNumber || null
				});
			});

			modifySearchParamsArr('cases');

			let dateFrom = getInputVal($datesWrapper.find('.from input')),
				dateTo = getInputVal($datesWrapper.find('.to input'));

			if (dateFrom) {
				searchParams.dates['from'] = dateFrom;
			}

			if (dateTo) {
				searchParams.dates['to'] = dateTo;
			}

			$.cookie('searchCasesParams', JSON.stringify(searchParams));
		}
	};

	ModalLogon.prototype.setIAgreeFlag = function () {
		let cookieDomainMatches = location.hostname.match(/((\.)?[a-z]+\.)?[a-z]+$/);

		$.cookie('is_agree_privacy_policy', 'true', {
			expires: 365,
			path: '/',
			domain: cookieDomainMatches ? cookieDomainMatches[0] : location.hostname
		});
	};

	ModalLogon.prototype.toggleRememberMeCheckbox = function (e) {
		let isChecked = e.currentTarget.checked,
			esiaUrl = '/account/esiaauth',
			isRememberMeParam = isChecked ? 'isRemember=true' : '';

		function filter (arr) {
			let result = [];

			for (let i = 0, imax = arr.length; i < imax; i++) {
				if (arr[i]) {
					result.push(arr[i]);
				}
			}

			return result;
		}

		this.partials.$esiaLink.attr('href', filter([esiaUrl, filter([isRememberMeParam, this.esiaRedirectAddress]).join('&')]).join('?'));
	};

	ModalLogon.prototype.toggleIAgreeCheckbox = function (e) {
		let isChecked = e ? e.currentTarget.checked : this.$el.find('input[name="IAgree"]').is(':checked');

		this.$el.find('.js-modal_logon-esia, .js-modal_logon-logon, .js-modal_logon-logon_autorization, .js-modal_logon-registeruser').toggleClass('b-modal_logon-button-handler--disabled js-modal_logon-prevent_event', !isChecked);
	};

	ModalLogon.prototype.initInputNamesMap = function (e) {
		this.inputNamesMap = this.inputNamesMap || {};

		let $inputsWithoutName = $('[data-name]', this.$el);

		$inputsWithoutName.each(function (i, elem) {
			let key = createGuid(),
				name = elem.getAttribute('data-name');

			this.inputNamesMap[key] = name;

			elem.setAttribute('name', key);
		}.bind(this));
	};

	ModalLogon.SuccessForm = (function () {
		let callback = null;

		function SuccessForm () {
			this.$successForm =  $('#popup-rememberSuccess2');
			this.$forms = $(null).add(this.$successForm);
		}

		SuccessForm.prototype = {
			show: function (message, params) {
				params = params || {};

				params.afterShowCallback && params.afterShowCallback();

				if (params.afterHideCallback) {
					callback = params.afterHideCallback;
				}

				this.$successForm.show().siblings('.b-popup-block').hide();

				$('.js-remember-email', this.$successForm).html(message);

				this.bind();
			},

			close: function () {
				this.$forms.hide();

				if (callback) {
					callback();

					callback = null;
				}

				this.unbind();
			},

			bind: function () {
				let self = this;

				$('form', self.$successForm).bind('submit', function () {
					self.close();

					return false;
				});

				$('.b-popup-block__close', self.$forms).bind('click', function () {
					self.close();
				});

				$($.browser.msie ? 'body' : window).bind('keyup.success_form_esc_close', function (e) {
					if (e && e.keyCode == 27) {
						self.close();
					}
				});
			},

			unbind: function () {
				$('form', self.$successForm).unbind('submit');
				$('.b-popup-block__close', self.$forms).unbind('click');
				$($.browser.msie ? 'body' : window).unbind('keyup.success_form_esc_close');
			},
		};

		return SuccessForm;
	})();

	window.ModalLogon = new ModalLogon;
});;
$(function () {
	let Pravocaptcha = function () {
			this.template = $('#pravocaptcha_template').html();
			this._req = {};
			this.partials = {};
			this.callback = null;
			this.cancelCalback = null;
			this.isLoading = false;
			this.isAudioLoading = false;
			this.isSending = false;
			this.id = null;
			this.isCloseable = true;
			this.isShown = false;

			try {
				this.configServices = config.services;
			} catch (e) {}

			this.isOldIE = $('html').hasClass('lt-ie10');

			this.initialize();
		};

	Pravocaptcha.prototype.delegateEvents = function () {
		let self = this;

		this.$el
			.delegate('.js-pravocaptcha-close', 'click', function () {
				self.hide({
					isManual: true
				});

				return false;
			})
			.delegate('.js-pravocaptcha-update', 'click', function () {
				self.update();

				return false;
			})
			.delegate('.js-pravocaptcha-listen', 'click', function () {
				self.listen();

				return false;
			})
			.delegate('.js-pravocaptcha-input', 'input change', function () {
				self.changeInput();
			})
			.delegate('.js-pravocaptcha-input', 'keyup', function (e) {
				if (e.which === 13) {
					self.send();
				}
			})
			.delegate('.js-pravocaptcha-send', 'click', function () {
				self.send();

				return false;
			});
	};

	Pravocaptcha.prototype.initAudio = function () {
		let self = this;

		this.player = new window.Audio();

		/*this.player.addEventListener('pause', function () {
			console.log('pause');
		});

		this.player.addEventListener('playing', function () {
			console.log('playing');
		});

		this.player.addEventListener('play', function () {
			console.log('play');
		});

		this.player.addEventListener('progress', function () {
			console.log('progress');
		});

		this.player.addEventListener('ended', function () {
			console.log('ended');
		});

		this.player.addEventListener('durationchange', function () {
			console.log('durationchange', this.duration);
		});*/

		this.player.addEventListener('loadeddata', function () {
			// console.log('loadeddata', this.duration);

			self.stopAudioPreloader();

			this.play();
		});

		this.player.onerror = function () {
			self.stopAudioPreloader();
		};

		/*this.player.addEventListener('loadedmetadata', function () {
			console.log('loadedmetadata', this.duration);
		});

		this.player.addEventListener('stalled', function () {
			console.log('stalled');
		});

		this.player.addEventListener('timeupdate', function () {
			console.log('timeupdate', this.currentTime);
		});

		this.player.addEventListener('waiting', function () {
			console.log('waiting');
		});*/
	};

	Pravocaptcha.prototype.initialize = function () {
		this.$el = $('<div class="b-pravocaptcha-modal">');
		
		this.$modal = $('<div class="b-pravocaptcha-modal_wrapper">');

		this.$modal.appendTo('body');

		this.initializeWasm();
	};

	Pravocaptcha.prototype.render = function () {
		this.$el.html(this.template);

		this.$el.appendTo(this.$modal);

		this.partials.$popup = this.$el.find('.js-pravocaptcha');
		this.partials.$image = this.$el.find('.js-pravocaptcha-image');
		this.partials.$imageWrapper = this.partials.$image.parent();
		this.partials.$field = this.$el.find('.js-pravocaptcha-field');
		this.partials.$input = this.partials.$field.find('.js-pravocaptcha-input');
		this.partials.$description = this.partials.$field.find('.js-pravocaptcha-description');
		this.partials.$close = this.$el.find('.js-pravocaptcha-close');
		this.partials.$update = this.$el.find('.js-pravocaptcha-update');
		this.partials.$listen = this.$el.find('.js-pravocaptcha-listen');
		this.partials.$send = this.$el.find('.js-pravocaptcha-send');

		this.initTabSwitchElems();

		this.toggleCloseButton();

		this.delegateEvents();
	};

	Pravocaptcha.prototype.show = function () {
		if (!this.isShown) {
			this.isShown = true;

			this.$modal.hide();
			
			this.render();

			this.$modal.show();
	
			this.toggleEscListener(true);
			this.toggleTabListener(true);

			this.update();

		}
	};

	Pravocaptcha.prototype.remove = function () {
		this.$el.remove();

		this.isShown = false;
	};

	Pravocaptcha.prototype.hide = function (options) {
		options = options || {};

		if (this.isCloseable || options.isForce) {
			this.remove();
			
			this.$modal.hide();
	
			this.toggleEscListener();
			this.toggleTabListener();
	
			this.player && this.player.pause();

			if (options.isManual && this.cancelCalback) {
				this.cancelCalback();
			}
		}
	};

	Pravocaptcha.prototype.toggleEscListener = function (on) {
		let self = this;

		$($.browser.msie ? 'body' : window)[on ? 'bind' : 'unbind']('keyup.pravocaptcha_esc_close', on && function(e) {
			if (e && e.keyCode == 27) {
				self.hide({
					isManual: true
				});
			}
		});
	};

	Pravocaptcha.prototype.initTabSwitchElems = function () {
		this.tabSwitchElems = [
			this.partials.$input[0],
			this.partials.$update[0],
			this.partials.$listen[0],
			this.partials.$send[0],
		];
	};

	Pravocaptcha.prototype.toggleTabListener = function (on) {
		let self = this;

		$($.browser.msie ? 'body' : window)[on ? 'bind' : 'unbind']('keydown.pravocaptcha_tab_switch', on && function (e) {
			if (e && e.keyCode == 9) {
				let activeElement = document.activeElement,
					activeSwitchElemIndex = self.tabSwitchElems.indexOf(activeElement),
					nextActiveElement = self.tabSwitchElems[activeSwitchElemIndex + 1];

				if (!nextActiveElement) {
					nextActiveElement = self.tabSwitchElems[0];
				}

				nextActiveElement.focus();

				e.preventDefault();

				return false;
			}
		});
	};

	Pravocaptcha.prototype.execute = function (callback, cancelCalback) {
		this.callback = callback;
		this.cancelCalback = cancelCalback || null;

		this.checkRelevance();
	};

	Pravocaptcha.prototype.checkRelevance = function () {
		let self = this;

		if ($.cookie('rcid')) {
			self.callback();
		} else {
			self.checkIsNeedShow(function (isNeedShow) {
				if (isNeedShow) {
					self.show();
				} else {
					self.callback();
				}
			});
		}
	};

	Pravocaptcha.prototype.checkIsNeedShow = function (callback) {
		let self = this;

		if (!self._req.checkIsNeedShow) {
			self._req.checkIsNeedShow = $.ajax({
				url: self.configServices.checkIsNeedShowCaptcha,
				type: 'get',
				dataType: 'json',
				cache: false,
				success: function(data) {
					callback(data && data.Result);
				},
				error: function () {
					callback(true);
				},
				complete: function () {
					delete (self._req.checkIsNeedShow);
				}
			});
		}
	};

	Pravocaptcha.prototype.getId = function (callback) {
		let self = this;

		this.startImagePreloader();

		this.id = null;

		this._req.getId = $.ajax({
			url: this.configServices.getCaptchaId,
			type: 'get',
			dataType: 'json',
			cache: false,
			success: function(data) {
				self.id = data.Result; // 'cf952fde-d05f-4f6c-95a6-006db9aa8d6e'; // https://jira.parcsis.org/browse/KAD-12378
			},
			complete: function (xhr, status) {
				if (status === 'success') {
					if (callback) {
						callback();
					} else {
						self.stopImagePreloader();
					}
				} else {
					self.stopImagePreloader();
				}
			}
		});
	};

	Pravocaptcha.prototype.setImage = function () {
		if (this.id) {
			let self = this,
				image = this.partials.$image[0];

			image.src = this.configServices.getCaptchaImage + this.id;

			image.onload = function () {
				self.stopImagePreloader();

				self.partials.$image.show();

				self.partials.$input.focus();
			};

			image.onerror = function () {
				self.stopImagePreloader();
			};
		}
	};

	Pravocaptcha.prototype.update = function () {
		if (!this.isLoading) {
			let self = this;

			this.player && this.player.pause();

			this.clearDescription();
			this.partials.$image.hide();
			this.partials.$input
				.val('')
				.trigger('change');

			this.getId(function () {
				self.setImage();
			});
		}
	};

	Pravocaptcha.prototype.startImagePreloader = function () {
		this.startPreloader(this.partials.$imageWrapper, 'isLoading');
	};

	Pravocaptcha.prototype.stopImagePreloader = function () {
		this.stopPreloader(this.partials.$imageWrapper, 'isLoading');
	};

	Pravocaptcha.prototype.startAudioPreloader = function () {
		this.startPreloader(this.partials.$listen, 'isAudioLoading');
	};

	Pravocaptcha.prototype.stopAudioPreloader = function () {
		this.stopPreloader(this.partials.$listen, 'isAudioLoading');
	};

	Pravocaptcha.prototype.startPreloader = function ($context, loadingFlagName) {
		if (!this[loadingFlagName]) {
			$context.addClass('b-preloader');
			
			this[loadingFlagName] = true;

			if (this.isOldIE) {
				let $preloaderSpin = $context.find('.js-preloader-spin'),
					$preloaderCircular = $preloaderSpin.find('.circular'),
					$preloaderPath = $preloaderSpin.find('.path'),
					self = this;

				function rotatePreloader () {
					if (self[loadingFlagName]) {
						$({deg: 0}).animate({deg: 360}, {
							duration: 2000,
							step: function(now) {
								$preloaderCircular.css({
									transform: 'rotate(' + now + 'deg)',
									msTransform: 'rotate(' + now + 'deg)'
								});
							},
							easing: 'linear',
							complete: function () {
								rotatePreloader();
							}
						});
					}
				}

				function dashPreloader () {
					if (self[loadingFlagName]) {
						$({
							dasharray: 1,
							dashoffset: 0
						}).animate({
							dasharray: 89,
							dashoffset: -35
						}, {
							duration: 750,
							step: function(now, fx) {
								if (fx.prop === 'dasharray') {
									$preloaderPath.css({
										strokeDasharray: now + ', 200'
									});
								} else if (fx.prop === 'dashoffset') {
									$preloaderPath.css({
										strokeDashoffset: now + 'px'
									});
								}
							},
							complete: function () {
								$({
									dashoffset: -35
								}).animate({
									dashoffset: -124
								}, {
									duration: 750,
									step: function(now) {
										$preloaderPath.css({
											strokeDashoffset: now + 'px'
										});
									},
									complete: function () {
										dashPreloader();
									}
								});
							}
						});
					}
				}
	
				rotatePreloader();
				dashPreloader();
			}
		}
	};

	Pravocaptcha.prototype.stopPreloader = function ($context, loadingFlagName) {
		$context.removeClass('b-preloader');

		if (loadingFlagName) {
			this[loadingFlagName] = false;
		}
	};

	Pravocaptcha.prototype.listen = function () {
		if (this.id) {
			let self = this,
				src = this.configServices.getCaptchaSound + this.id + '.mp3'; // 'http://ol2.mp3party.net/online/1768/1768268.mp3'

			if (!this.player) {
				this.initAudio();
			}

			this.player.pause();

			if (this.player._src === src) {
				if (this.player.currentTime) {
					this.player.currentTime = 0;
				}

				this.player.play();
			} else if (window.Blob) {
				this.startAudioPreloader();

				let xhr = this._req.getAudio = new XMLHttpRequest();

				xhr.onload = function () {
					if (this.status === 200) {
						let blob = new Blob([this.response], {type : 'audio/mpeg'}),
							URL = window.URL || window.webkitURL,
							audioUrl = URL.createObjectURL(blob);

						if (self.player.src) {
							URL.revokeObjectURL(self.player.src);
						}

						self.player._src = src;
						self.player.src = audioUrl;
					} else {
						self.stopAudioPreloader();

						self.showMessage('Ошибка ' + this.status);
					}
				};

				xhr.open('GET', src, true);
				xhr.responseType = 'arraybuffer';
				xhr.send();
			} else {
				this.startAudioPreloader();

				this.player.src = this.player._src = src;
			}
		}
	};

	Pravocaptcha.prototype.changeInput = function () {
		this.partials.$field.toggleClass('b-pravocaptcha-field--value', !!this.partials.$input.val());
	};

	Pravocaptcha.prototype.send = function () {
		if (!this.isLoading && !this.isSending) {
			this.isSending = true;

			let self = this,
				blockPopupStyleClass = 'b-pravocaptcha--block',
				waitStyleClass = 'g-wait';

			this.clearDescription();

			this.partials.$popup.addClass(waitStyleClass);
			//this.partials.$popup.addClass(blockPopupStyleClass);

			this._req.send = $.ajax({
				url: this.configServices.checkCaptcha,
				type: 'get',
				dataType: 'json',
				data: {
					id: this.id,
					text: this.partials.$input.val().replace(/^\s*(\S*)\s*$/, '$1')
				},
				success: function(data) {
					if (data.Result) {
						self.callback && self.callback(self.id);

						self.callback = null;

						self.hide({
							isForce: true
						});
					} else {
						self.update();
						self.setDescription('Введен неверный код, картинка обновлена');
					}
				},
				complete: function () {
					self.isSending = false;

					self.partials.$popup.removeClass(waitStyleClass);
					//self.partials.$popup.removeClass(blockPopupStyleClass);
				}
			});
		}
	};

	Pravocaptcha.prototype.setDescription = function (text) {
		this.partials.$description.text(text);
	};

	Pravocaptcha.prototype.clearDescription = function () {
		this.setDescription('');
	};

	Pravocaptcha.prototype.removeCloseAbility = function () {
		this.toggleCloseAbility(false);
	};

	Pravocaptcha.prototype.toggleCloseAbility = function (isCloseable) {
		this.isCloseable = isCloseable !== undefined ? isCloseable : !this.isCloseable;
	};

	Pravocaptcha.prototype.toggleCloseButton = function () {
		this.partials.$close.toggle(this.isCloseable);
	};

	Pravocaptcha.prototype.initializeWasm = function () {
		let self = this;
		let isValid;

		try {
			isValid = (typeof window.WebAssembly !== 'undefined') && (typeof window.Promise !== 'undefined') && (typeof window.Promise.prototype['finally'] !== 'undefined');  // window.Promise.prototype['finally'] - ie8
		} catch (e) {
			isValid = false;
		}

		if (isValid) {
			self.initializeFp();

			let checkRelevance = self.checkRelevance;

			self.checkRelevance = function () {
				if (!self._req.setFpWaiting) {
					self._req.setFpWaiting = true;

					self._req.setFp.finally(function () {
						self._req.setFpWaiting = false;

						if ($.cookie('wasm')) {
							checkRelevance.call(self);
						} else {
							self.loadWasm(function () {
								checkRelevance.call(self);
							});
						}
					});
				}
			};
		} else {
			let cookieDomainMatches = location.hostname.match(/\..*\..*$/);

			$.cookie('wasm', '68D5834C6D9AE0EBB645C93DA0272857', {
				path: '/',
				domain: cookieDomainMatches ? cookieDomainMatches[0] : location.hostname
			});
		}
	};

	Pravocaptcha.prototype.loadWasm = function (callback) {
		let self = this;

		self.initTextEncoder(function () {
			if (!self._req.loadWasm && !self._req.checkIsNeedShow) {
				self._req.loadWasm = $.ajax({
					url:  self.configServices.getCaptchaWasm,
					cache: false,
					dataType: 'script',
					success: function () {
						if (window.wasm) {
							let wasmPromise = new Promise(function (resolve) {
									window.onwasm = function () {
										resolve();
									};
								});

							window.wasm['default'](self.configServices.getCaptchaWasmBG + '?_=' + (new Date).getTime()); // window.wasm['default'] - ie8

							wasmPromise.then(function () {
								delete (self._req.loadWasm);
								callback();
							});
						} else {
							delete (self._req.loadWasm);
							callback();
						}
					},
					error: function () {
						delete (self._req.loadWasm);
						callback();
					}
				});
			}
		});
	};

	Pravocaptcha.prototype.initializeFp = function () {
		let self = this;

		self._req.setFp = new Promise(function (resolve, reject) {
			self.initTextEncoder(function () {
				$.ajax({
					url: '/Content/Static/js/common/fp.js?_=1705670688006',
					cache: true,
					dataType: 'script',
					success: function () {
						window.fp.default('/Content/Static/js/common/fp_bg.wasm?_=1705670688006').then(function () {
							window.fp.get().then(function (data) {
								resolve(data);
							}, function (err) {
								reject(err);
							});
						});
					},
					error: function (err) {
						reject(err);
					}
				});
			});
		});
	};

	Pravocaptcha.prototype.initTextEncoder = function (callback) {
		let self = this;

		if (!self._req.loadEncoding) {
			if ((typeof window.TextEncoder === 'undefined') || (typeof window.TextDecoder === 'undefined')) {
				self._req.loadEncoding = $.ajax({
					url: '/Content/Static/js/libs/encoding.js',
					dataType: 'script',
					complete: function () {
						delete (self._req.loadEncoding);
						callback();
					}
				});
			} else {
				callback();
			}
		}
	};

	Pravocaptcha.prototype.showMessage = function (title, message) {
		try {
			let notifyView = Common.get('Notify').view;

			if (notifyView) {
				this.showMessage = function (title, message) {
					notifyView.show({
						type: 'error',
						title: title || '',
						message: message || '',
					});
				};
			}
		} catch (e) {
			try {
				if (showPageMessage) {
					this.showMessage = function (title, message) {
						showPageMessage({
							type:'error',
							title: title || '',
							message: message || '',
							right: 20
						});
					};
				}
			} catch (e) {
				this.showMessage = function (title, message) {
					console.error({
						title: title || 'Ошибка',
						message: message || 'Произошла ошибка, сделайте скриншот и обратитесь в техническую поддержку cases@pravo.ru',
					});
				};
			}
		}

		this.showMessage(title, message);
	};

	window.pravocaptcha = new Pravocaptcha;
});;
!function(e,n,o){function i(e){return e}function t(e){return decodeURIComponent(e.replace(r," "))}let r=/\+/g,s=e.cookie=function(o,r,u){if(undefined!==r){if(u=e.extend({},s.defaults,u),null===r&&(u.expires=-1),"number"==typeof u.expires){let a=u.expires,p=u.expires=new Date;p.setDate(p.getDate()+a)}return r=s.json?JSON.stringify(r):String(r),n.cookie=[encodeURIComponent(o),"=",s.raw?r:encodeURIComponent(r),u.expires?"; expires="+u.expires.toUTCString():"",u.path?"; path="+u.path:"",u.domain?"; domain="+u.domain:"","; samesite="+(u.sameSite||"none"),"; secure"].join("")}for(r=s.raw?i:t,u=n.cookie.split("; "),a=0;p=u[a]&&u[a].split("=");a++)if(r(p.shift())===o)return o=r(p.join("=")),s.json?JSON.parse(o):o;return null};s.defaults={},e.removeCookie=function(n,o){return null!==e.cookie(n)&&(e.cookie(n,null,o),!0)}}(jQuery,document);;
function initFilters() {
	return '#sug-participants textarea, #sug-judges input[type=text], #caseCourt input[type=text], #sug-cases input[type=text], #sug-dates .from input[type=text], #sug-dates .to input[type=text]';
}

//;(function() {
	//----------- таблица дел ----------------
	function setWidthOfTh(){ //Подгоняет ширину ячеек у заголовочной таблицы
		let plaintiffTdWidth = parseInt(($('#b-cases').width() - $('#b-cases thead th').eq(0).width()-$('#b-cases thead th').eq(1).width()-$('#b-cases thead th').eq(2).width()-16*5)/2);
		$('#b-cases thead th').eq(3).width(plaintiffTdWidth);
	//	$('#b-cases-head').parent().width($('#b-cases').width());
	}
	function setWidth(targetElem,initialElem,/*учет паддингов*/plus){
		if(!plus) plus = 0;
		$(targetElem).width($(initialElem).width()+plus);
	}

	function setWidthColumn() {
		if ($('#b-cases-theader').css('display') == 'table') {
			let headerColumns = $('#b-cases-theader').find('th'),
				cols = $('#b-cases').find('col');

			for (let i = 0, max = cols.length; i < max; i++) {
				$(cols[i]).css('width', i === (max - 1) ? 'auto' : $(headerColumns[i]).css('width'));
			}
		}
	}

	function counterPosition() {
		let elem = $('.b-totalcases'),
			container = $(elem).parent(),
			containerHeight = $(container).height(),
			childs = $(container).children(),
			marginTopElement = 0;
		$(childs).each(function() {
			marginTopElement += returnBlockHeight($(this));
			marginTopElement += parseInt($(this).css('marginTop')) + parseInt($(this).css('marginBottom'));
		});

		if (marginTopElement > containerHeight) {
			$(elem).css({'position':'static', 'padding-left': '', 'padding-right': ''});
		} else {
			$(elem).css({'position':'absolute', 'padding-left': '18px'});
		}
	}

	function checkPravocaptchaCallback() {}

  /**
   * Поисковый запрос
   * @param {number} page 
   */
	function doSearchRequest(page){
		checkPravocaptchaCallback = function (token) {
			setColumnHeight();

			let info = returnRequestInfo(page);
      console.log(info);
			if (!info) {
				return false;
			}

			loading($('#main-column2 .b-case-loading .loading'), 12);

			globals.filterRequest = $.ajax({
				type:"post",
				cache : false,
				url: config.services.getInstances,
				//dataType: "json",
				data: info,
				contentType: "application/json",
				beforeSend: function (xhr) {
					xhr.setRequestHeader('x-date-format', 'iso');

					if (token) {
						xhr.setRequestHeader('RecaptchaToken', token);
					}
				},
				success: function (result) {
					let $cases,
						totalCount,
						$results = $('.b-results'),
						$noResults = $('.b-noResults', '#main-column2');

					/* Задача - http://jira.parcsis.org/browse/VS-11842
					* Решение - http://stackoverflow.com/questions/7267014/ie9-table-has-random-rows-which-are-offset-at-random-columns
					*/
					result = result && $.trim(result).replace(/>[ \t\r\n\v\f]*</g, '><');

					$cases = $('#b-cases');

					$cases.html(result);

					totalCount = parseInt($('#documentsTotalCount').val(), 10);

					if (totalCount) {
						$('#totalCount').text(totalCount);

						$noResults.addClass('g-hidden');

						reDrawPages({
							linesPerPage: parseInt($('#documentsPageSize').val(), 10),
							page:  parseInt($('#documentsPage').val(), 10),
							pagesCount:  parseInt($('#documentsPagesCount').val(), 10),
							totalCount: totalCount
						});

						$results
							.removeClass('g-hidden')
							.find('#table')
							.scrollTop(0);

						if ($('.more', '#b-cases tbody tr').length) {
							showHideEntities($('.b-button', '#b-cases tbody tr'));
						}

						$('.b-rollover').remove();

						$('#b-cases span.js-rollover').each(function() {
							let $this = $(this),
								cell = $this.closest('td'),
								cellIndex = cell.index(),
								row = cell.closest('tr'),
								html = $('.js-rolloverHtml', this).html();

							$this.attachRollover({
								vertical: cellIndex >= 2,
								html: html
							});
						});

						typeSwitcher($('.b-type-switcher'));

						if ($('#b-footer-pages ul li').length == 4) {
							$('#b-footer-pages ul').hide();
						} else {
							$('#b-footer-pages ul').show();
						}

						$('#contentHeader .h2').hide();
						$('.b-found-total').text('Найдено '+ totalCount + ' дел').show();
						$('.b-feedback').animate({'opacity':'0'}, 1000);
						$('.b-feedback').hide();

						try {
							if (ga) {
								ga('send', 'pageview', '/Kad/Search');
							}
						} catch(err) {}

						//if (yaCounter13493410) {
						//    yaCounter13493410.hit('/Kad/Search');
						//}
					} else {
						let court = $('input.js-input', '#caseCourt').valEx(),
							caseNumber = $('div.tag input', '#sug-cases').eq(0).valEx();

						$results.addClass('g-hidden');

						$noResults.removeClass('g-hidden');

						new NoResults({
							$court: $('.b-combobox', '#caseCourt').clone(),
							caseNumber: caseNumber,
							container: $noResults,
							request: info
						});

						reDrawPages({
							totalCount: 0
						});

						$('#contentHeader .h2').show();
						$('.b-found-total').hide();
						$('.b-feedback').show();
						$('.b-feedback').animate({'opacity':'1'}, 1000);
					}
				},
				complete: function() {
					highlightFound({filters:$('#sug-participants textarea')});
					globals.filterRequest = null;
					hideLoading();
					stateOfButton();
					setColumnHeight();
					setWidthColumn();
					//$('#table').scrollTo('0%',300);
				},
				error: function (xhr) {
					ajaxSetupError(xhr);

					$('.b-case-blank').show();
				}
			}); //close $.ajax
		};

		Common.executePravocaptcha(checkPravocaptchaCallback);
	}

  /**
   * 
   * @param {number} page 
   * @param {object} returnObject 
   * @returns 
   */
	function returnRequestInfo(page, returnObject){
		let info = {};

		info.Page = parseInt(page, 10) || 1;
		info.Count = 25;

		let groupByCategory;
		let $active = $('#filter-cases li.active').eq(0);
		if($active){
			if($active.hasClass('administrative')){
				groupByCategory = 'A';
			}
			if($active.hasClass('bankruptcy')){
				groupByCategory = 'B';
			}
			if($active.hasClass('civil')){
				groupByCategory = 'G';
			}
		}

		if (groupByCategory) {
			info.CaseType = groupByCategory;
		}

		let $courts = $('#caseCourt .js-select'),
			courtsArray = [];

		$.each($courts, function() {
			let $select = $(this),
				$options = $select.children('option'),
				$input = $select.parent().find('.js-input'),
				inputVal = $input.val();

			if (inputVal) {
				$.each($options, function() {
					let $option = $(this);

					if ($option.text() == inputVal) {
						courtsArray.push($option.val());
					}
				});
			}
		});

		/*if (globals.isVasEnteredInKad) {
			if (courtsArray) {
				for (let i = 0, max = courtsArray.length; i < max; i++) {
					if (globals.isVasEnteredInKad && (courtsArray[i] !== 'VAS')) {
						delete globals.isVasEnteredInKad;
					}
				}
			} else {
				delete globals.isVasEnteredInKad;
			}
		}*/

		info.Courts = courtsArray;

		let dates = $('#selected-dates').val() || '';
		dates = dates.replace(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g, '$3.$2.$1').match(/\d{2,4}\.\d{1,2}\.\d{1,2}/g) || ['',''];
		dates[0] = (dates[0] || '2000.01.01').split('.');
		dates[1] = (dates[1] || '2030.01.01').split('.');
    console.log('dates: ', dates);
	//	info.DateFrom = Common.date.returnDotNetDate(
	//		Common.date.returnDateUTC(dates[0][0],dates[0][1],dates[0][2])
	//	);
	//	info.DateTo = Common.date.returnDotNetDate(
	//		Common.date.returnDateUTC(dates[1][0],dates[1][1],dates[1][2], 23, 59, 59)
	//	);

		dates = ($('#selected-dates').val() || '').split(' - ');

		if (dates[0] && !checkDate(dates[0]) || dates[1] && !checkDate(dates[1])) {
			showPageMessage({
				type: 'error',
				title: 'Ошибка',
				message: 'Введена неверная дата',
				right: 20
			});

			return false;
		}

		if (dates[0]) {
			info.DateFrom = dates[0].replace(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g, '$3-$2-$1') + 'T00:00:00' || ['', '']; //'2000-01-01T00:00:00'
		} else {
			info.DateFrom = null;
		}

		if (dates[1]) {
			info.DateTo = dates[1].replace(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/g, '$3-$2-$1') + 'T23:59:59' || ['', '']; //'2000-01-01T00:00:00'
		} else {
			info.DateTo = null;
		}

		let tags = 'Sides,Judges,CaseNumbers'.split(','); //названия тегов
		let groups = 'sug-participants,sug-judges,sug-cases'.split(',');

		for(j in tags){
			let tag = tags[j];
			info[tag] = [];
			let field;
			if ($('#' + groups[j]+' input[type=text]').length ) {
				field = $('#' + groups[j] + ' input[type=text]');
			} else {
				field = $('#' + groups[j] + ' textarea');
			}
			field.each(function(){
				let $currentField = $(this);
				if(!$currentField.hasClass('g-ph')) {
					if (tag == "Sides") {
						info[tag].push({
							Name: $currentField.valEx(),
							Type: parseInt($currentField.closest('.tag').find('.b-type-switcher .selected input').val(), 10),
							ExactMatch: $currentField.data('exactmatch') ? true : false
						});
					} else if (tag == 'Judges') {
						let judgeId = $currentField.attr('id');

						// Тип судьи не является критерием поиска
						info[tag].push({
							JudgeId: judgeId,
							Type: -1 //$currentField.closest('.tag').find('.b-type-switcher .selected input').val() || 1
						});
					} else {
						info[tag].push($currentField.valEx());
					}
				}
			});
		}

		info.WithVKSInstances = $('.vksCheckClass').attr('checked');

		/*if (globals.isVasEnteredInKad) {
			info.InstanceLevel  = 1;
		}*/
    console.log('info: ', info);
    /*
      {
        "Page": 1,
        "Count": 25,
        "Courts": [
          "MSK"
        ],
        "DateFrom": "2012-01-01T00:00:00",
        "DateTo": "2013-12-31T23:59:59",
        "Sides": [
          {
            "Name": "МАСТЕР БАНК",
            "Type": -1,
            "ExactMatch": false
          }
        ],
        "Judges": [
          {
            "JudgeId": "50f923cd-9672-4a91-8285-b94cfbede836",
            "Type": -1
          }
        ],
        "CaseNumbers": [
          "а40-172055/2013"
        ],
        "WithVKSInstances": false
      }
    */
		return returnObject ? info : $.toJSON(info);
	}

	function highlightFound(params){
		params = params || {};
		let colors = 'yellow,blue,green'.split(',');
		let colorId = 0;
		params.filters = params.filters || $('#sug-participants textarea');
		$(params.filters).each(function(){
			let stringToHighlight = $.trim($(this).valEx()).replace('=','');
			if (stringToHighlight) {
				$('#b-cases').find('td.plaintiff, td.respondent').highlight(stringToHighlight, colors[colorId]);
				(colorId == colors.length - 1) ? colorId = 0 : colorId++;
			}
		});
	}

	function getCookieSideInfo() {
		let sideName = $.cookie('sideCardName'),
			typeFilter = $.cookie('sideCardNameTypeFilter'),
			$filter, $typeFilter;
      console.log('sideName: ', sideName);
      console.log('typeFilter: ', typeFilter);
      
		if (sideName || typeFilter) {
			if (sideName) {
				$('#sug-participants textarea')
					.val(sideName)
					.removeClass('g-ph')
					.trigger('keyup');
			}

			if (typeFilter) {
				$filter = $('#filter-cases');

				switch (typeFilter) {
					case 'А' :
						$typeFilter = $filter.find('.administrative');
						break
					case 'Б' :
						$typeFilter = $filter.find('.bankruptcy');
						break
					case 'Г' :
						$typeFilter = $filter.find('.civil');
						break
				}

				$typeFilter.addClass('active');
			}

			$('#b-form-submit').trigger('click', [true]);
		}
	}

  /**
   * 
   */
	function setSavedSearchCasesParams() {
		if ($.cookie('searchCasesParams')) {
			if ($('#userExternalId').val()) {
				let $mainColumn = $('#main-column1');

				if ($mainColumn.length) {
					let $datesWrapper = $mainColumn.find('#sug-dates'),
						searchParams = JSON.parse($.cookie('searchCasesParams')),
						participants = searchParams.participants,
						judges = searchParams.judges,
						courts = searchParams.courts,
						cases = searchParams.cases,
						dates = searchParams.dates,
						activeFilter = searchParams.activeFilter;

					for (let i = 0, max = participants.length; i < max; i++) {
						let participant = participants[i],
							$participantWrapper = $mainColumn.find('#sug-participants .tag:first');

						if (participant.Name) {
							$participantWrapper
								.find('textarea')
								.val(participant.Name)
								.removeClass('g-ph');
						}

						$participantWrapper
							.find('.switcher-container')
							.click()
							.find('input[type="radio"][value="' + participant.Type + '"]')
							.closest('li')
							.click();

						if (i !== (max - 1)) {
							addCaseTags($participantWrapper, $participantWrapper.find('textarea').attr('placeholder'), true);
						}
					}

					for (let i = 0, max = judges.length; i < max; i++) {
						let judge = judges[i],
							$judgeWrapper = $mainColumn.find('#sug-judges .tag:first');

						if (judge.Name) {
							$judgeWrapper
								.find('input[type="text"]')
								.val(judge.Name)
								.attr('id', judge.Id)
								.removeClass('g-ph');
						}

						if (i !== (max - 1)) {
							addCaseTags($judgeWrapper, $judgeWrapper.find('input[type="text"]').attr('placeholder'), true);
						}
					}

					for (let i = 0, max = courts.length; i < max; i++) {
						let court = courts[i],
							$courtWrapper = $mainColumn.find('#caseCourt .tag:first'),
							$input = $courtWrapper.find('input[type="text"]'),
							$select =  $courtWrapper.find('select');

						if (court.Name) {
							$input
								.val(court.Name)
								.removeClass('g-ph');
						}

						$.each($select.find('option'), function(index, option) {
							let $option = $(option);

							if ($option.text() === $input.val()) {
								$option.attr('selected', true);
								$select.closest('.js-b-combobox').data('combobox').selected = index;
							}
						});

						if (i !== (max - 1)) {
							addCaseTags($courtWrapper, $courtWrapper.find('input[type="text"]').attr('placeholder'), true);
						}

					}

					for (let i = 0, max = cases.length; i < max; i++) {
						let currentCase = cases[i],
							$caseWrapper = $mainColumn.find('#sug-cases .tag:first');

						if (currentCase.Number) {
							$caseWrapper
								.find('input[type="text"]')
								.val(currentCase.Number)
								.removeClass('g-ph');
						}

						if (i !== (max - 1)) {
							addCaseTags($caseWrapper, $caseWrapper.find('input[type="text"]').attr('placeholder'), true);
						}
					}


					if (dates.from) {
						$datesWrapper
							.find('.from input')
							.val(dates.from)
							.removeClass('g-ph');
					}

					if (dates.to) {
						$datesWrapper
							.find('.to input')
							.val(dates.to)
							.removeClass('g-ph');
					}

					if (searchParams.wasSearching) {
						$('.vksCheckClass').attr('checked', searchParams.withVKSInstances);

						if (activeFilter) {
							$('#filter-cases')
								.find('.' + activeFilter)
								.click();
						} else {
							$('#b-form-submit').click();
						}
					}
				}
			}
		}

		$.cookie('searchCasesParams', null);
	}
  
  function ready(){ //=================== ready =========================
		initBrowsersPopup();
		if($('.more', '#b-cases tbody tr').length){
			showHideEntities($('.b-button', '#b-cases tbody tr'));
		}

		if(!$('#sug-cases input, #sug-participants textarea').hasClass('g-ph')){
			$('#sug-cases input, #sug-participants textarea').val('');
		}
		$('#b-form-submit').click(function(e, isVKSInstances) {
			stateOfButton();

			if($(this).hasClass('b-form-submit_noactive')) {
				return false;
			}

			if (!globals.filterRequest) {
				!isVKSInstances && $('#filter-cases li').removeClass('active');//Сброс фильтра при новом поиске
				if (!$(this).hasClass("no-kad-search")) {
					doSearchRequest(1);
				}
			}
		});
		$('#b-footer-pages #pages a').live('click',function(){
			if (!globals.filterRequest) {
				let $pageLink = $(this),
					match = $pageLink.attr('href').match(/#page([0-9]+)$/);

				//если список загружен аяксом
				if(match && !$pageLink.parent('.active').length){
					let page = match[1];
					doSearchRequest(page);
				}
			}

			return false;
		});

		//переключение страниц
		$($.browser.msie ? window.document : window).keydown(function(e){
			if (!globals.filterRequest) {
				if(e.ctrlKey == true && /^37$|^39$/.test(e.keyCode)){
					let aArr;

					if (e.keyCode === 37) {
						aArr = $('li.larr a')[0];
					} else if (e.keyCode === 39) {
						aArr = $('li.rarr a')[0];
					}

					if (aArr) {
						let match = $(aArr).attr('href').match(/#page([0-9]+)$/);

						if(match) {
							let page = match[1];
								doSearchRequest(page);
						}
					}
				}
			}
		});

		//$(window).resize();//?????


		setTimeout(function(){
				setColumnHeight();
				showHideCalendar();
				setWidthColumn();
				counterPosition();
			},1000
		);
		$(window).resize(function() {
			setTimeout(function () {
				setWidthColumn();
				setColumnHeight();
				showHideCalendar();
				counterPosition();
			}, 0);
		});

		let $mainColumn1 = $('#main-column1'),
			$comboboxBlocks = $mainColumn1.find('.js-b-combobox'),
			comboboxes = [];

		$.each($comboboxBlocks, function (index, block) {
			comboboxes.push($(block).data('combobox'));
		});

		$mainColumn1
			.resize(function() {
				counterPosition();
			})
			.bind('scroll', function () {
				for (let i = 0, max = comboboxes.length; i < max; i++) {
					let currentCombobox = comboboxes[i];

					if (currentCombobox.$suggest.is(':visible')) {
						currentCombobox.setSuggestPosition();
					}
				}
			});


		$('.tag input[type=text], .tag textarea, #sug-dates input[type=text]')
			.bind('keypress', function(e, triggerParams) {
				triggerParams = triggerParams || {};

				if((e.which === 13 || (triggerParams.which === 13)) && $('#b-suggest').css('display') != 'block') {
					if (e.ctrlKey == true && $(this).parent().find('.add').length > 0) {
						addCaseTags($(this).parent(), $(this).attr('placeholder'));
					} else {
						$(this).blur();
						stateOfButton();

						if ($('#b-form-submit').hasClass('b-form-submit_noactive')) {
							return false;
						}
					}

					return false;
				}
			})
			.bind('keypress.kad_search', function(e, triggerParams) {
				triggerParams = triggerParams || {};

				if((e.which === 13 || (triggerParams.which === 13)) && $('#b-suggest').css('display') != 'block') {
					if (!(e.ctrlKey == true && $(this).parent().find('.add').length > 0)) {
						if (!globals.filterRequest) {
							doSearchRequest(1);
						}
					}

					return false;
				}
			});

		stateOfButton();

		$('.tag textarea').TextAreaExpander(15);

		$('#filter-cases li').click(function(){
			if (!globals.filterRequest) {
				if($(this).hasClass('active')){
					$(this).removeClass('active');
				}
				else{
					$(this).addClass('active').siblings().removeClass('active');
				}

				stateOfButton();

				if($('#b-form-submit').hasClass('b-form-submit_noactive')) return false;

				doSearchRequest(1);
			}

			return false;
		});

		/*if (globals.isVasEnteredInKad) {
			doSearchRequest(1);
		}*/

		/* End Переключение категорий
		 *********************************************************/

		if ($('#contentHeader .js-checkbox').checkbox) {
			$('#contentHeader .js-checkbox')
				.checkbox({
					cls: 'ui-checkbox-fake',
					empty: '/Content/img/t/1x1.gif?v=1'
				})
				.click(function(e) {
					if (!globals.filterRequest) {
						setTimeout(function() {
							$('#b-form-submit').trigger('click', true);
						}, 1);
					} else {
						return false;
					}
				});
		}

		$('html').css('overflowY', 'hidden');

		$('#contentHeader .js-legend-checkbox-trigger').bind('click', function() {
			$('#contentHeader .js-legend-checkbox')
				.find('.js-checkbox')
				.trigger('click');
		});

		getCookieSideInfo();

		!!$.cookie('sideCardName') && $.cookie('sideCardName', null); // после того, как получили информацию из cookie, сбрасываем участника дела KAD-3180

		setSavedSearchCasesParams();

	//	//попап для ссылки на андроид-приложение
	//	$('#androidApplication').live('click.popup', function() {
	//		if (navigator.userAgent && /Android/.test(navigator.userAgent)) {//телефон
	//			return true;
	//		} else {//настольный компьютер и др
	//			new AlertDialog({
	//				message: '<p class="g-margins">Чтобы скачать приложение используйте QR-код:</p>' +
	//					'<p><img src="/i/c/qr-code-android.png" alt=""/></p>'
	//			});
	//			return false;
	//		}
	//	})

	}
	$(document).ready(
    ready);
//})();
;

/**
 * SpecialNotification
 */
$(function () {
	let $document = $(document),
		$body = $('body'),
		now = new Date();

	function SpecialNotification() {
		let $specialNotificationTemplate = $('#special_notification_template');

		if (window.Handlebars) {
			let $container = $('<div>');

			$container.html(Handlebars.compile($specialNotificationTemplate.html())());

			this.$modal = $($container.children()[0]);
		} else {
			this.$modal = $specialNotificationTemplate.tmpl();
		}

		this.$closeButtons = this.$modal.find('.js-special_notification-close, .js-special_notification-popup-link');
	}

	SpecialNotification.prototype.show = function () {
		$body.append(this.$modal);

		this.bindEvents();

		let cookieDomainMatches = location.hostname.match(/((\.)?[a-z]+\.)?[a-z]+$/);

		$.cookie('special_notification_shown', 'true', {
			expires: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8),
			path: '/',
			domain: cookieDomainMatches ? cookieDomainMatches[0] : location.hostname
		});

		this.isShown = true;
	};

	SpecialNotification.prototype.close = function () {
		this.$modal.remove();

		this.unbindEvents();
	};

	SpecialNotification.prototype.bindEvents = function () {
		let self = this;

		$document.bind('keydown.close_special_notification', function (e) {
			if (e.which === 27) {
				self.close();
			}
		})

		this.$closeButtons.bind('click.close_special_notification', function () {
			self.close();
		});
	};

	SpecialNotification.prototype.unbindEvents = function () {
		$document.unbind('keydown.close_special_notification');
		this.$closeButtons.unbind('click.close_special_notification');
	};

	window.kadSpecialNotification = new SpecialNotification;

	function showNotification () {
		if (now < (new Date(Date.UTC(2020, 5, 26, 9))) && !$.cookie('special_notification_shown')) {
			kadSpecialNotification.show();
		}
	}

	if (window.Guard) {
		setTimeout(function () {
			if (window.Guard.User.id) {
				showNotification();
			}
		}, 0);
	} else {
		showNotification();
	}
});;


/**
 * PromoNotification
 */
$(function () {
	let alarmTitle = $('#alarm_title').val(),
		alarmMessage = $('#alarm_message').val(),
		alarmServiceId = $('#alarm_service_id').val(),
		$alarmIsHiddenLink = $('#alarm_is_hidden_link'),
		alarmIsHiddenLink = !!$alarmIsHiddenLink.length && $alarmIsHiddenLink.val().toLowerCase() === 'true',
		$document, $notification, $closeButton;

	if (!(window.kadSpecialNotification && window.kadSpecialNotification.isShown)) {
		if (alarmMessage || alarmTitle) {
			let notificationCookie = $.cookie('Notification_' + alarmServiceId);

			if (notificationCookie) {
				if (/_shown$/.test(notificationCookie)) {
					return;
				} else {
					let expireTimeStamp = notificationCookie.match(/_(\d+)$/)[1],
						expireDays = Math.floor((expireTimeStamp - (new Date)) / (1000*60*60*24)) + 2;

					 $.cookie('Notification_' + alarmServiceId, notificationCookie + '_shown', {
						 expires: expireDays
					 });
				}
			}
	
			$document = $(document);

			alarmMessage = unescape(alarmMessage).replace(/\n/gmi, '<br />');

			$notification = $('#promo_notification_template').tmpl({
				title: alarmTitle,
				message: alarmMessage,
				isHiddenLink: alarmIsHiddenLink
			});

			$closeButton = $notification.find('.js-promo_notification-popup-close');

			$closeButton.bind('click.close_promo_notification', function () {
				closeNotification();

				return false;
			});

			$document.bind('keydown.close_promo_notification', function (e) {
				if (e.which === 27) {
					closeNotification();
				}
			});

			$('body').append($notification);

			function closeNotification () {
				$notification.remove();

				$closeButton.unbind('click.close_promo_notification');
				$document.unbind('keydown.close_promo_notification');
			}
		}
	}

	return;
});

// Код для тестирования. Вставлять туда, где должны появиться инпуты.
/*<script type="text/javascript">
	(function () {
		if (localStorage && localStorage.notifications) {
			let notifications = JSON.parse(localStorage.notifications),
				map = {
					Title: 'title',
					Message: 'message',
					IconUrl: 'image'
				};

			if (notifications.MA) {
				for (let key in notifications.MA) {
					if (map[key]) {
						document.write('<input type="hidden" id="alarm_' + map[key] + '" value="' + notifications.MA[key] + '" />');
					}
				}
			}
		}
	})();
</script>*/;
