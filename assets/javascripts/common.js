/* global $, NA, Hashes */
/*------------------------------------*\
	$%SUMMARY
\*------------------------------------*/

/**
 * SUMMARY.............It's me !
 * GLOBAL..............Define global variables.
 * COMMON..............This functions are used on more one page, and execute on each pages.
 */





/*------------------------------------*\
	$%GLOBAL
\*------------------------------------*/

var website = website || {},
	$window = $(window),
	$html = $("html"),
	$body = $("body");





/*------------------------------------*\
	$%COMMON
\*------------------------------------*/

(function (publics) {
	"use strict";

	var privates = {};

	publics.generateEmail = function () {
		$(".generate-email").click(function () {
			var email = "bruno-lesieur_gmail-com";

			email = email.replace(/-/g, ".").replace(/_/g, "@");

			$(this)
				.attr("href", "mailto:" + email)
				.text(email);
		});
	};

	publics.generateAddress = function () {
		$(".add7").text("66");
	};

	privates.loadSections = function(callback) {
		NA.socket.emit("load-sections", {
			lang: $html.attr('lang'),
			variation: $body.data('variation')
		});
		NA.socket.on("load-sections", function (data) {
			var targetTop = ".top.sections > .return > a",
				targetBottom = ".bottom.sections > .return > a",
				$section,
				i;

			function animatedOpenSection($sectionWrap) {
				var $section = $sectionWrap.find("section"),
					tempHeight = $section;

				$section.css({
					height: "0"
				}).animate({
					height: tempHeight
				}, 500, function () {
					$(this).removeAttr("style");
				});
			}

			for (i in data.topPart) {
				if (data.topPart.hasOwnProperty(i)) {
					if (!$(".top.sections > .section > ." + i).length) {
						$section = $(data.topPart[i]);
						$(targetTop).parent().after($section);
						animatedOpenSection($section);
					}
					targetTop = ".top.sections > .section > ." + i;
				}
			}

			for (i in data.bottomPart) {
				if (data.bottomPart.hasOwnProperty(i)) {
					if (!$(".bottom.sections > .section > ." + i).length) {
						$section = $(data.bottomPart[i]);
						$(targetBottom).parent().after($section);
						animatedOpenSection($section);
					}
					targetBottom = ".bottom.sections > .section > ." + i;
				}
			}

			callback();
		});
	};

	publics.activeEditMode = function () {
		$(".toggle.checkbox").click(function () {
			var $this = $(this);

			if (!$this.hasClass("checked")) {
				$this.addClass("checked");
				$this.find("input").prop("checked", true);
				$html.addClass("is-editable");
			} else {
				$this.removeClass("checked");
				$this.find("input").prop("checked", false);
				$html.removeClass("is-editable");
			}
		});
	};

	publics.accountLogin = function () {
		$(".account-login-button").click(function (e) {
			var script = document.createElement("script");
			e.preventDefault();

			$(this).addClass("loading");

			script.type = "text/javascript";
			script.setAttribute("class", "jshashes");
			script.addEventListener("load", function() {
				var data = {
					email: $("#account-login-email").val(),
					password: new Hashes.SHA1().hex($("#account-login-password").val())
				};

				NA.socket.emit('account-login', data);
			});
			script.src = "javascripts/hashes.min.js";
			$(".jshashes").remove();
			document.getElementsByTagName("head")[0].appendChild(script);
		});
	};

	publics.listeningAccountLogin = function () {
		NA.socket.on('account-login', function (data) {
			if (data.authSuccess) {
				location.reload();
			} else {
				$(".account-login-button").removeClass("loading");
				$(".submit .errors ").show();
			}
		});
	};

	publics.accountLogout = function () {
		$(".account-logout-button").click(function (e) {
			if (!website.isEditable) {
				e.preventDefault();

				$(this).addClass("loading");

				NA.socket.emit('account-logout', {});
			}
		});
	};

	publics.listeningAccountLogout = function () {
		NA.socket.on('account-logout', function () {
			location.reload();
		});
	};

	publics.sendMessage = function () {
		var $name = $(".contact--name"),
			$email = $(".contact--email"),
			$validation = $(".contact--validation"),
			$isAnonyme = $(".contact-success .is-anonyme"),
			$contact = $(".contact"),
			$success = $(".contact-success"),
			$back = $(".contact-success--back"),
			$anonyme = $(".contact--tip--anonyme"),
			$reply = $(".contact--tip--reply"),
			$detailInput = $("#contact-detail"),
			$nameInput = $("#contact-name"),
			$emailInput = $("#contact-email"),
			$validationInput = $("#contact-valitadion"),
			regex = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;

		$detailInput.on("keyup", function () {
			if ($detailInput.val().length === 0) {
				$name.addClass("contact-disabled");
				$email.addClass("contact-disabled");
				$validation.addClass("contact-disabled");
			} else {
				$name.removeClass("contact-disabled");
				if ($nameInput.val().length !== 0) {
					$email.removeClass("contact-disabled");
				}
				$validation.removeClass("contact-disabled");
			}
		});

		$nameInput.on("keyup", function () {
			if ($nameInput.val().length === 0) {
				$email.addClass("contact-disabled");
				$anonyme.removeClass("contact-tip-disabled");
				$reply.removeClass("contact-tip-disabled");
			} else {
				$email.removeClass("contact-disabled");
				$anonyme.addClass("contact-tip-disabled");
				if ($emailInput.val().length !== 0) {
					$reply.addClass("contact-tip-disabled");
				}
			}
		});

		$emailInput.on("keyup", function () {
			if ($emailInput.val().length === 0) {
				$email.removeClass("filled");
			} else {
				$email.addClass("filled");
			}

			if (!regex.test($emailInput.val())) {
				$email.removeClass("good");
				$reply.removeClass("contact-tip-disabled");
			} else {
				$email.addClass("good");
				$reply.addClass("contact-tip-disabled");
			}
		});

		$validationInput.on("click", function () {
			NA.socket.emit('send-email', {
				detail: $detailInput.val(),
				name: $nameInput.val(),
				email: regex.test($emailInput.val()) ? $emailInput.val() : undefined
			});
		});

		$back.click(function (e) {
			e.preventDefault();
			$contact.addClass("is-displayed");
			$success.removeClass("is-displayed");
		});

		NA.socket.on('send-email', function () {
			$detailInput.val("");
			$name.addClass("contact-disabled");
			$email.addClass("contact-disabled");
			$validation.addClass("contact-disabled");
			$contact.removeClass("is-displayed");
			$success.addClass("is-displayed");
			(regex.test($emailInput.val())) ? $isAnonyme.removeClass("is-displayed") : $isAnonyme.addClass("is-displayed");
		});
	};

	publics.setAnalytics = function () {
		var ua = document.body.getAttribute('data-ua');
		if (ua) {
			ga('create', ua, 'auto');
		}
	};

	publics.init = function () {
		var halfHeight,
			halfHeightPadding,
			$main,
			$topSections,
			$topSection,
			$bottomSections,
			$bottomSection;

		privates.loadSections(function () {
			$main = $(".main");
			$topSections = $(".top.sections");
			$topSection = $topSections.find(".section");
			$bottomSections = $(".bottom.sections");
			$bottomSection = $bottomSections.find(".section");

			function calcHalfHeight() {
				if (window.matchMedia("(max-width: 323px), (max-height: 500px)").matches) {
					halfHeight = $window.height();
					halfHeightPadding = $window.height() - 40;
				} else {
					halfHeight = $window.height() - ($main.height() * 2);
					halfHeightPadding = $window.height() - ($main.height() * 2) - 56;
				}
			}

			function closeSection() {
				$topSection.find(".content").css("height", "");
				$bottomSection.find(".content").css("height", "");

				$topSections.removeClass("has-open");
				$bottomSections.removeClass("has-open");

				$topSection.removeClass("open");
				$bottomSection.removeClass("open");

				$main.css("bottom", "");
				$main.css("top", "");

				$main.removeClass("to top");
				$main.removeClass("to bottom");
			}

			function openBackground($this, currentSection) {
				if (!$this.hasClass("open")) {
					if ($body.hasClass("index")) {
						$body.removeClass().addClass(currentSection);
					} else {
						$body.addClass("speed-2").addClass("from-end");
						setTimeout(function () {
							$body.removeClass().addClass(currentSection);
							setTimeout(function () {
								$body.removeClass("speed-2");
							}, 500);
						}, 500);
					}
				}
			}

			function openSection($currentSection, current, other, notPushed) {
				if (!$html.hasClass("is-editable")) {
					if (!notPushed) {
						history.pushState($currentSection.data("url"), "", "/" + $currentSection.data("url") + "/");
					}
					if (document.body.getAttribute('data-ua')) {
						ga('send', 'pageview', "/" + $currentSection.data("url") + "/", {
							title: "/" + $currentSection.data("url") + "/",
							location: location.href,
							page: "/" + $currentSection.data("url") + "/"
						});
					}

					$topSection.removeClass("open").removeClass("start");
					$bottomSection.removeClass("open").removeClass("start");
					$currentSection.addClass("open");
					$("." + current + ".sections").addClass("has-open");

					$main.css(other, "");
					$main.css(current, halfHeight);

					$topSection.find(".content").css("height", "");
					$bottomSection.find(".content").css("height", "");
					$currentSection.find(".content").css("height", halfHeight);

					$currentSection.find(".scrollable").css("height", halfHeightPadding);

					$main.removeClass("to " + current);
					$main.addClass("to " + other);
				}
			}

			calcHalfHeight();

			$(".return a").click(function (event) {
				event.stopPropagation();

				$body.addClass("from-end");
				setTimeout(function () {
					$body.removeClass().addClass("index");
				}, 1000);

				$html.trigger("click");
			});

			 $("h1").click(function (event) {
				if ($(this).parents(".open").length > 0) {
					event.stopPropagation();

				$body.addClass("from-end");
				setTimeout(function () {
					$body.removeClass().addClass("index");
				}, 1000);

					$html.trigger("click");
				}
			});

			$html.click(function () {
				history.pushState("", "", "/");
				if (document.body.getAttribute('data-ua')) {
							ga('send', 'pageview', "/", {
								title: "/",
								location: location.href,
								page: "/"
							});
						}

				$body.addClass("from-end");
				setTimeout(function () {
					$body.removeClass().addClass("index");
				}, 1000);

				closeSection();
			}).find(".edit-atlas--popup, .members").click(function() {
				return false;
			});

			$topSection.each(function () {
				var $this = $(this);

				if ($this.hasClass("open")) {
					$main.css("top", halfHeight);
					$this.find(".content").css("height", halfHeight);
					$this.find(".scrollable").css("height", halfHeightPadding);
				}
			}).click(function (event, notPushed) {
				var $this = $(this),
					currentSection = $this.find(".content")[0].classList.value.replace(/content/g, "").trim();
				event.stopPropagation();

				openBackground($this, currentSection);

				openSection($this, "top", "bottom", notPushed);
			});

			$bottomSection.each(function () {
				var $this = $(this);

				if ($this.hasClass("open")) {
					$main.css("bottom", halfHeight);
					$this.find(".content").css("height", halfHeight);
					$this.find(".scrollable").css("height", halfHeightPadding);
				}

			}).click(function (event, notPushed) {
				var $this = $(this),
					currentSection = $this.find(".content")[0].classList.value.replace(/content/g, "").trim();
				event.stopPropagation();

				openBackground($this, currentSection);

				openSection($this, "bottom", "top", notPushed);
			});

			$window.resize(function () {
				calcHalfHeight();

				if ($main.hasClass("top")) {
					$main.css("bottom", halfHeight);
					$bottomSection.filter(".open").find(".content").css("height", halfHeight);
					$bottomSection.filter(".open").find(".scrollable").css("height", halfHeightPadding);
				}
				if ($main.hasClass("bottom")) {
					$main.css("top", halfHeight);
					$topSection.filter(".open").find(".content").css("height", halfHeight);
					$topSection.filter(".open").find(".scrollable").css("height", halfHeightPadding);
				}
			});

			window.addEventListener("popstate", function (e) {
				if (e.state) {
					$(".section[data-url=" + e.state + "]").trigger("click", true);
				} else {
					history.back();
				}
			});

			publics.accountLogin();
			publics.listeningAccountLogin();
			publics.accountLogout();
			publics.listeningAccountLogout();
			publics.sendMessage();

			publics.generateEmail();
			publics.generateAddress();

			publics.editAtlas(function () {
				$(".toggle.checkbox").removeClass("checked");
				$(".toggle.checkbox").find("input").prop("checked", false);
			}, function () {
				$(".toggle.checkbox").addClass("checked");
				$(".toggle.checkbox").find("input").prop("checked", true);
			});

			publics.activeEditMode();

			publics.setAnalytics();
		});
	};
}(website));





/*------------------------------------*\
	$%START PROCESS
\*------------------------------------*/

$(function () {
	"use strict";

	// Launch Common JavaScript.
	website.init();
});