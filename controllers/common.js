/* jslint node: true */
var website = {};

website.components = {};

(function (publics) {
	"use strict";

	website.components.editAtlas = require('./modules/edit-atlas');
	website.components.componentAtlas = require('./modules/component-atlas');

	publics.setModules = function () {
		var NA = this,
			path = NA.modules.path;

		NA.modules.nodemailer = require('nodemailer');
		NA.modules.jshashes = require('jshashes');
		NA.modules.common = require(path.join(NA.serverPath, NA.webconfig.variationsRelativePath, 'fr-fr/common.json'));
	};

	publics.setSockets = function () {
		var NA = this,
			io = NA.io,
			nodemailer = NA.modules.nodemailer,
			common = NA.modules.common;

		io.sockets.on('connection', function (socket) {
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
					locals = {};

				/* Asynchrone render of template and variations */
				locals = NA.specific(dataEmit.variation + ".json", dataEmit.lang, locals);
				locals = NA.common(dataEmit.lang, locals);

				/* Asynchrone addon for editAtlas render */
				locals.languageCode = dataEmit.lang;
				locals.fs = dataEmit.lang + "/" + dataEmit.variation + ".json";
				locals.fc = dataEmit.lang + "/" + NA.webconfig.variation;
				locals = website.components.editAtlas.setFilters.call(NA, locals);

				/* Asynchrone Top Components */
				data.topPart = {};
				data.topPart.offers = NA.view("partials/section-offers.htm", locals);
				data.topPart.offers = NA.view("partials/section-offers.htm", locals);
				data.topPart.bepo = NA.view("partials/section-bepo.htm", locals);
				data.topPart.book = NA.view("partials/section-book.htm", locals);
				data.topPart.website = NA.view("partials/section-website.htm", locals);
				data.topPart.blog = NA.view("partials/section-blog.htm", locals);
				data.topPart["front-end"] = NA.view("partials/section-front-end.htm", locals);
				data.topPart["unknown-top"] = NA.view("partials/section-unknown-top.htm", locals);

				/* Asynchrone Top Components */
				data.bottomPart = {};
				data.bottomPart["unknown-bottom"] = NA.view("partials/section-unknown-bottom.htm", locals);
				data.bottomPart.websites = NA.view("partials/section-websites.htm", locals);
				data.bottomPart.skills = NA.view("partials/section-skills.htm", locals);
				data.bottomPart['contact-me'] = NA.view("partials/section-contact-me.htm", locals);
				data.bottomPart['about-me'] = NA.view("partials/section-about-me.htm", locals);
				data.bottomPart.nodeatlas = NA.view("partials/section-nodeatlas.htm", locals);
				data.bottomPart.games = NA.view("partials/section-games.htm", locals);

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

	publics.changeVariations = function (next, locals, request) {
		var NA = this,
			session = request.session;

		locals.session = session;

		locals.fs = ((locals.languageCode) ? locals.languageCode + "/": "") + locals.routeParameters.variation;
		locals.fc = ((locals.languageCode) ? locals.languageCode + "/": "") + locals.webconfig.variation;

		locals = website.components.editAtlas.setFilters.call(NA, locals);
		locals = website.components.componentAtlas.includeComponents.call(NA, locals, "components", "mainTag", "componentName");

		next();
	};

}(website));

exports.setSockets = website.setSockets;
exports.setModules = website.setModules;
exports.setConfigurations = website.setConfigurations;
exports.changeVariations = website.changeVariations;