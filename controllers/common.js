/* jslint node: true */
var website = {};

website.components = {};

(function (publics) {
	"use strict";

	website.components.socketio = require('../components/controllers/socket-io');
	website.components.editAtlas = require('../components/controllers/edit-atlas');
	website.components.componentAtlas = require('../components/controllers/component-atlas');

	publics.loadModules = function () {
		var NA = this,
			path = NA.modules.path;

		NA.modules.cookie = require('cookie');
		NA.modules.socketio = require('socket.io');
		NA.modules.nodemailer = require('nodemailer');
		NA.modules.common = require(path.join(NA.websitePhysicalPath, NA.webconfig.variationsRelativePath, 'fr-fr/common.json'));
	};

	publics.setConfigurations = function (next) {
		var NA = this,
			socketio = NA.modules.socketio,
			params = {};

		website.components.socketio.initialisation.call(NA, socketio, function (socketio) {
			params.socketio = socketio;
			website.asynchrones.call(NA, params);
			next();
		});
	};

	publics.asynchrones = function (params) {
		var NA = this,
			nodemailer = NA.modules.nodemailer,
			common = NA.modules.common,
			socketio = params.socketio;

		socketio.sockets.on('connection', function (socket) {
			var session = socket.request.session,
				activeDemo = true;

			if (session.account) {
				activeDemo = false;
			}

			website.components.editAtlas.sockets.call(NA, socket, true, !activeDemo);

			socket.on('account-login', function (data) {
				var dataResponse = {};

				if (!session.account) {
					if (data.email === NA.webconfig._emailAccountAuth &&
						data.password === NA.webconfig._passwordAccountAuth)
					{
						session.account = {};
						session.touch().save();

						dataResponse.authSuccess = true;
					} else {
						dataResponse.authSuccess = false;
					}

					socket.emit('account-login', dataResponse);
				}
			});

			socket.on('account-logout', function (data) {
				if (session.account) {
					session.account = undefined;
					session.touch().save();

					socket.emit('account-logout', data);
				}
			});

			socket.on('load-sections', function (dataEmit) {
		        var data = {},
	        		currentVariation = {};

        		/* Asynchrone render of template and variations */
				currentVariation = NA.addSpecificVariation(dataEmit.variation + ".json", dataEmit.lang, currentVariation);
		        currentVariation = NA.addCommonVariation(dataEmit.lang, currentVariation);

		        /* Asynchrone addon for editAtlas render */
				currentVariation.languageCode = dataEmit.lang;
				currentVariation.fs = dataEmit.lang + "/" + dataEmit.variation + ".json";
				currentVariation.fc = dataEmit.lang + "/" + NA.webconfig.commonVariation;
				currentVariation = website.components.editAtlas.setFilters.call(NA, currentVariation);

				/* Asynchrone Top Components */
		        data.topPart = {};
		        data.topPart.offers = NA.newRender("section-offers.htm", currentVariation);
		        data.topPart.offers = NA.newRender("section-offers.htm", currentVariation);
		        data.topPart.bepo = NA.newRender("section-bepo.htm", currentVariation);
		        data.topPart.book = NA.newRender("section-book.htm", currentVariation);
		        data.topPart.website = NA.newRender("section-website.htm", currentVariation);
		        data.topPart.blog = NA.newRender("section-blog.htm", currentVariation);
		        data.topPart["front-end"] = NA.newRender("section-front-end.htm", currentVariation);
		        data.topPart["unknown-top"] = NA.newRender("section-unknown-top.htm", currentVariation);

				/* Asynchrone Top Components */
				data.bottomPart = {};
		        data.bottomPart["unknown-bottom"] = NA.newRender("section-unknown-bottom.htm", currentVariation);
		        data.bottomPart.websites = NA.newRender("section-websites.htm", currentVariation);
		        data.bottomPart.skills = NA.newRender("section-skills.htm", currentVariation);
		        data.bottomPart['contact-me'] = NA.newRender("section-contact-me.htm", currentVariation);
		        data.bottomPart['about-me'] = NA.newRender("section-about-me.htm", currentVariation);
		        data.bottomPart.nodeatlas = NA.newRender("section-nodeatlas.htm", currentVariation);
		        data.bottomPart.games = NA.newRender("section-games.htm", currentVariation);

		        /* Load Components */
				socket.emit('load-sections', data);
			});

			socket.on('send-email', function (data) {
				// Prepare email.
				var transporter = nodemailer.createTransport('smtps://' + NA.webconfig._smtpLoginAuth + ':' + NA.webconfig._smtpPasswordAuth + '@in-v3.mailjet.com'),
					mailOptions = {
					    from: common.email.from,
					    to: common.email.to,
						replyTo: common.email.replyTo.anonyme,
					    subject: common.email.subject.anonyme,
					    text: data.detail
					};

				if (data.name) {
					mailOptions.subject = data.name + " " + common.email.subject.auth;
				}
				if (data.name && data.email) {
					mailOptions.replyTo = '"' + data.name + '" <' + data.email + '>';
					mailOptions.subject = data.name + ' ' + common.email.subject.reply + ' (' + data.email + ')';
				}

				// Send mail with defined transport object.
				transporter.sendMail(mailOptions, function(error) {
				    if (error) {
				        return socket.emit('send-email', error);
				    }

			        /* Inform client. */
					socket.emit('send-email');
				});

			});
		});
	};

	publics.changeVariation = function (params, mainCallback) {
		var NA = this,
			variation = params.variation,
			session = params.request.session;

		variation.session = session;

		variation.fs = ((variation.languageCode) ? variation.languageCode + "/": "") + variation.currentRouteParameters.variation;
		variation.fc = ((variation.languageCode) ? variation.languageCode + "/": "") + variation.webconfig.commonVariation;

		variation = website.components.editAtlas.setFilters.call(NA, variation);
		variation = website.components.componentAtlas.includeComponents.call(NA, variation, "components", "mainTag", "componentName");

		mainCallback(variation);
	};

}(website));

exports.loadModules = website.loadModules;
exports.setConfigurations = website.setConfigurations;
exports.changeVariation = website.changeVariation;