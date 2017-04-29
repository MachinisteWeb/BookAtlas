var website = website || {},
	$html = $('html'),
	$body = $('body'),
	$window = $(window);

(function (publics) {

	var privates = {},
		evaluation = eval;

	privates.keys = {};
	privates.ctrl = {};
	privates.auto = false;
	privates.activate = $("[data-edit=true]").length;

	privates.toDash = function (text) {
		return text.replace(/([A-Z])/g, function ($1) { return "-" + $1.toLowerCase(); });
	};

	privates.cleanPath = function (path) {
		return path.replace(/\./g, "\\\.").replace(/\[/g, "\\\[").replace(/\]/g, "\\\]");
	};

	privates.cleanName = function (name) {
		return name.replace(/\$/g, "\\\$");
	};

	publics.cleanDataEditAtlas = function ($object) {
		$object.removeAttr("data-edit-targeted");
		$object.find('[data-edit-targeted=true]').removeAttr("data-edit-targeted");
		return $object;
	};

	publics.clone = function (object) {
		var copy,
			result;

		if (null === object || undefined === object || "object" !== typeof object) {
			result = object;
		}
		if (object instanceof Date) {
			copy = new Date();
			copy.setTime(object.getTime());
			result = copy;
		}
		if (object instanceof Array) {
			result = object.slice(0);
		}
		if (object instanceof Object) {
			copy = {};
			publics.forEach(object, function (attr) {
				copy[attr] = publics.clone(object[attr]);
			});
			result = copy;
		}

		return result;
	};

	publics.forEach = function (object, callback) {
		for (var current in object) {
			if (object.hasOwnProperty(current)) {
				callback(current, object);
			}
		}
	};

	publics.moveEditableArea = function () {
		var $pc = $(".edit-atlas--popup"),
			$popup = $(".edit-atlas");

		$pc.mouseleave(function () {
			$.data(this, "draggable", false);
			$.data(this, "offset-x", 0);
			$.data(this, "offset-y", 0);
			$(this).css("cursor", "");
		}).mousedown(function (e) {
			e.stopPropagation();
			if ($(e.target).hasClass('edit-atlas--popup') ||
				$(e.target).hasClass('edit-atlas--inline') ||
				$(e.target).hasClass('edit-atlas--block'))
			{
				$popup.removeClass("is-docked-right");
				$popup.removeClass("is-docked-left");
				$.data(this, "draggable", true);
				$.data(this, "offset-x", e.pageX);
				$.data(this, "offset-y", e.pageY);
				$(this).css("cursor", "all-scroll");
			}
		}).mouseup(function () {
			$.data(this, "draggable", false);
			$.data(this, "offset-x", 0);
			$.data(this, "offset-y", 0);
			$(this).css("cursor", "");
		}).mousemove(function (e) {
			e.stopPropagation();
			var positionX, positionY, deltaX, deltaY;

			if ($(this).data("draggable")) {
				deltaX = parseInt($(this).data("offset-x") - e.pageX + $window.scrollLeft(), 10);
				deltaY = parseInt($(this).data("offset-y") - e.pageY + $window.scrollTop(), 10);
				positionX = parseInt($(this).offset().left, 10);
				positionY = parseInt($(this).offset().top, 10);

				$(this).css("-webkit-transform", "translateY(0%) translateX(0%)")
					.css("-moz-transform", "translateY(0%) translateX(0%)")
					.css("-ms-transform", "translateY(0%) translateX(0%)")
					.css("-o-transform", "translateY(0%) translateX(0%)")
					.css("transform", "translateY(0%) translateX(0%)");

				$(this).css("left", positionX - deltaX).css("top", positionY - deltaY);

				$popup.css("left", 0).css("top", 0);

				$.data(this, "offset-x", e.pageX);
				$.data(this, "offset-y", e.pageY);
			}
		}).data("draggable", false).data("offset-x", 0).data("offset-y", 0);

		$(".edit-atlas--to-left").click(function () {
			$pc.attr("style", "");
			$popup
				.attr("style", "")
				.addClass("is-docked-left")
				.removeClass("is-docked-right");
			privates.resizeArea();
			$window.bind("resize", privates.resizeArea);
		});
		$(".edit-atlas--anchor").click(function () {
			$pc.attr("style", "");
			$popup
				.attr("style", "")
				.removeClass("is-docked-left")
				.removeClass("is-docked-right");
			$popup.find(".edit-atlas--templates").height("");
			$window.unbind("resize", privates.resizeArea);
		});
		$(".edit-atlas--to-right").click(function () {
			$pc.attr("style", "");
			$popup
				.attr("style", "")
				.addClass("is-docked-right")
				.removeClass("is-docked-left");
			privates.resizeArea();
			$window.bind("resize", privates.resizeArea);
		});

	};

	privates.resizeArea = function () {
		 var $popup = $(".edit-atlas");

		if ($popup.hasClass("is-docked-left") || $popup.hasClass("is-docked-right")) {
			$popup.find(".edit-atlas--templates").height($popup.height() - $popup.find(".edit-atlas--wysiwyg").height() - $popup.find(".edit-atlas--wysiwyg-bottom").height() - 100);
			$popup.find(".edit-atlas--variations--common textarea").height($popup.height() - 120);
			$popup.find(".edit-atlas--variations--specific textarea").height($popup.height() - 120);
		}
	};

	publics.eaNumberId = 0;

	publics.addhocEditAtlas = function () {
		$("select").each(function () {
			var $opener = $(this),
				$subpart = $opener.find("[data-edit=true]");

			$opener.removeAttr("data-addhoc");

			if ($subpart.length) {
				$opener.attr("data-addhoc", true);
			}

			function setPropagation() {
				if ($subpart.length > 0 && $html.hasClass("is-editable")) {
					$subpart.each(function () {
						privates.loadData($(this), undefined);
					});
					$opener.blur();
				}
			}

			$opener.unbind("click", setPropagation).bind("click", setPropagation);
		});
		$("a").each(function () {
			var $opener = $(this),
				$subpart = $opener.find("[data-edit=true]");

			$opener.removeAttr("data-addhoc");

			if ($subpart.length) {
				$opener.attr("data-addhoc", true);
			}

			function setPropagation() {
				if ($subpart.length > 0 && $html.hasClass("is-editable")) {
					$subpart.each(function () {
						privates.loadData($(this), undefined);
					});
				}
			}

			$opener.unbind("click", setPropagation).bind("click", setPropagation);
		});
	};

	privates.cancelModification = function ($editedObject, $clone, extend) {
		$clone.find(".edit-atlas--cancel").click(function () {
			var $this;
			if (!$html.hasClass("is-editable")) {
				$this = $('[data-edit-path='+ privates.cleanPath($editedObject.data('edit-path')) + ']');
				$this.html($clone.find("label").attr("data-cancel"));
				if (typeof $editedObject.data('edit-source') === 'string') {
					evaluation($editedObject.data('edit-source'));
				}
				if (typeof extend === 'function') {
					extend();
				}
				$clone.remove();
				privates.closePopupIfAllCancel();
			}
		});
	};

	privates.cancelModificationAttr = function ($editedObject, $clone, currentName) {
		$clone.find(".edit-atlas--cancel").click(function () {
			var $this;
			if (!$html.hasClass("is-editable")) {
				if (currentName === '$text') {
					$this = $('[data-edit-attr-path-' + privates.cleanName(currentName) + '='+ privates.cleanPath($editedObject.data('edit-attr-path-' + currentName)) + ']');
					$this.html($(this).parents(".as-text:first").find("label").attr("data-cancel"));
				} else {
					$this = $('[data-edit-attr-path-' + currentName + '='+ privates.cleanPath($editedObject.data('edit-attr-path-' + currentName)) + ']');
					$this.attr(currentName, $(this).parents(".as-text:first").find("label").attr("data-cancel"));
				}
				if (typeof $editedObject.data('edit-attr-source-' + currentName) === 'string') {
					evaluation($editedObject.data('edit-attr-source-' + currentName));
				}
				$(this).parents(".as-text:first").remove();
				privates.closePopupIfAllCancel();
			}
		});
	};

	privates.manageCkeditor = function ($editedObject, $clone) {
		$clone.find(".edit-atlas--wysiwyg").click(function () {
			var $wysiwyg = $(this),
				alreadyLoad = false;

			function createEditor() {
				CKEDITOR.disableAutoInline = true;
				CKEDITOR.inline($wysiwyg.parents(".as-html:first").find("textarea")[0], {
					enterMode : CKEDITOR.ENTER_BR,
					shiftEnterMode : CKEDITOR.ENTER_P,
					extraPlugins: 'sharedspace',
					entities_latin: false,
					entities: false,
					sharedSpaces: {
						top: 'edit-atlas--wysiwyg',
						bottom: 'edit-atlas--wysiwyg-bottom'
					},
					toolbar: [
						{ name: 'document', items: [ 'Source' ] },
						{ name: 'clipboard', items: [ 'Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo' ] },
						{ name: 'tools', items: [ 'Maximize', 'ShowBlocks' ] },
						'/',
						{ name: 'editing', items: [ 'Find', 'Replace', '-', 'SelectAll', '-', 'Scayt' ] },
						{ name: 'basicstyles', items: [ 'Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', '-', 'RemoveFormat' ] },
						'/',
						{ name: 'paragraph', items: [ 'NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Blockquote', 'CreateDiv', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock', '-', 'BidiLtr', 'BidiRtl' ] },
						'/',
						{ name: 'links', items: [ 'Link', 'Unlink', 'Anchor', 'TextColor', 'BGColor', 'Image', 'Flash', 'Table', 'HorizontalRule', 'Smiley', 'SpecialChar', 'PageBreak', 'Iframe' ] },
						'/',
						{ name: 'styles', items: [ 'Styles', 'Format', 'Font', 'FontSize' ] }
					]
				});

				function watchCkeditor(i) {
					CKEDITOR.instances[i].on('change', function () {
						var $this;
						$clone.find("textarea").val(CKEDITOR.instances[i].getData());
						$this = $('[data-edit-path='+ privates.cleanPath($editedObject.data('edit-path')) + ']');
						$this.html(CKEDITOR.instances[i].getData());
						if (typeof $editedObject.data('edit-source') === 'string') {
							evaluation($editedObject.data('edit-source'));
						}
					});
					CKEDITOR.instances[i].on("instanceReady", function() {
						privates.resizeArea();
					});
				}

				publics.forEach(CKEDITOR.instances, function (i) {
					watchCkeditor(i);
				});
			}

			if (!$html.hasClass("is-editable")) {
				$wysiwyg.parents(".as-html").addClass("as-alternative");

				if (!alreadyLoad) {
					(function(d, script) {
						script = d.createElement('script');
						script.type = 'text/javascript';
						script.async = true;
						script.onload = function(){
							alreadyLoad = true;
							createEditor();
						};
						script.src = '//cdn.ckeditor.com/4.4.7/full-all/ckeditor.js';
						d.getElementsByTagName('head')[0].appendChild(script);
					}(document));
				} else {
					createEditor();
				}
			}
		});
	};

	privates.editHtml = function ($editedObject, $popup) {
		var $template,
			$clone;

		if ($editedObject.data("edit-type") === "html" &&
			$popup.find("." + privates.cleanPath($editedObject.data('edit-path'))).length === 0)
		{
			$template = $(".edit-atlas--template.as-html");
			$clone = $template.clone().removeClass("edit-atlas--template");
			$clone = publics.cleanDataEditAtlas($clone);
			$clone.find("textarea").attr("id", "ea-editor-" + publics.eaNumberId);
			$popup.find(".edit-atlas--insert").before($clone);
			$clone.find("label").addClass($editedObject.data('edit-path'));
			$clone.find(".edit-atlas--info").html('<span class="as-link">' + $editedObject.data('edit-file') + "</span> > " + $editedObject.data('edit-path'));
			publics.goToBlock($clone.find(".edit-atlas--info .as-link"));
			if ($editedObject.data('edit-source')) {
				$clone.find("textarea").hide();
				NA.socket.emit('source-variation', {
					path: $editedObject.data('edit-path'),
					file: $editedObject.data('edit-file')
				});
			} else {
				$clone.find("textarea").val($editedObject.html().trim());
				$clone.find("label").attr("data-cancel", $editedObject.html().trim());
			}

			if (!$editedObject.data('edit-source') || typeof $editedObject.data('edit-source') === 'string') {
				$clone.find("textarea").keyup(function () {
					var $this = $('[data-edit-path='+ privates.cleanPath($editedObject.data('edit-path')) + ']');
					$this.html($clone.find("textarea").val());
					if (typeof $editedObject.data('edit-source') === 'string') {
						evaluation($editedObject.data('edit-source'));
					}
				});
			}

			privates.cancelModification($editedObject, $clone, function () {
				if (typeof CKEDITOR !== 'undefined' &&
					Object.keys(CKEDITOR.instances).length > 0 &&
					CKEDITOR.instances[$clone.find("textarea").attr("id")])
				{
					CKEDITOR.instances[$clone.find("textarea").attr("id")].destroy();
				}
			});
			privates.editedObjects.push($editedObject);
			publics.targetDataEditAtlas();

			privates.manageCkeditor($editedObject, $clone);

			$clone.find(".edit-atlas--plaintext").click(function () {
				var $plainText = $(this);

				if (!$html.hasClass("is-editable")) {
					$plainText.parents(".as-html").removeClass("as-alternative");
					if (typeof CKEDITOR !== 'undefined' &&
						Object.keys(CKEDITOR.instances).length > 0 &&
						CKEDITOR.instances[$plainText.parents(".as-html").find("textarea").attr("id")])
					{
						CKEDITOR.instances[$plainText.parents(".as-html").find("textarea").attr("id")].destroy();
					}
					privates.resizeArea();
				}
			});

			publics.eaNumberId++;
		}
	};

	privates.editText = function ($editedObject, $popup) {
		var $template,
			$clone;

		if ($editedObject.data("edit-type") === "text" &&
			$popup.find("." + privates.cleanPath($editedObject.data('edit-path'))).length === 0)
		{
			$template = $(".edit-atlas--template.as-text");
			$clone = $template.clone().removeClass("edit-atlas--template");
			$clone = publics.cleanDataEditAtlas($clone);
			$popup.find(".edit-atlas--insert").before($clone);
			$clone.find("label").addClass($editedObject.data('edit-path'));
			$clone.find(".edit-atlas--info").html('<span class="as-link">' + $editedObject.data('edit-file') + "</span> > " + $editedObject.data('edit-path'));
			publics.goToBlock($clone.find(".edit-atlas--info .as-link"));
			if ($editedObject.data('edit-source')) {
				$clone.find("input").hide();
				NA.socket.emit('source-variation', {
					path: $editedObject.data('edit-path'),
					file: $editedObject.data('edit-file')
				});
			} else {
				$clone.find("input").val($editedObject.html().trim());
				$clone.find("label").attr("data-cancel", $editedObject.html().trim());
			}
			if (!$editedObject.data('edit-source') || typeof $editedObject.data('edit-source') === 'string') {
				$clone.find("input").keyup(function () {
					var $this = $('[data-edit-path='+ privates.cleanPath($editedObject.data('edit-path')) + ']');
					$this.html($clone.find("input").val());
					if (typeof $editedObject.data('edit-source') === 'string') {
						evaluation($editedObject.data('edit-source'));
					}
				});
			}

			privates.cancelModification($editedObject, $clone);
			privates.editedObjects.push($editedObject);
			publics.targetDataEditAtlas();
		}
	};

	privates.editAttr = function ($editedObject, $popup) {
		var $template,
			$clone,
			accept = false;

		function attrModificationProcess(i) {
			function attrIntoValue($editedObject, $clone, name) {
				if (name === '$text') {
					$clone.find("input").val($editedObject.html().trim());
					$clone.find("label").attr("data-cancel", $editedObject.html().trim());
				} else {
					$clone.find("input").val($editedObject.attr(name).trim());
					$clone.find("label").attr("data-cancel", $editedObject.attr(name).trim());
				}
			}

			function attrPropagation ($editedObject, $clone, name, currentName) {
				if (!$editedObject.data('edit-attr-source-' + name) || typeof $editedObject.data('edit-attr-source-' + name) === 'string') {
					$clone.find("input").keyup(function () {
						var $this;
						if (currentName === '$text') {
							$this = $('[data-edit-attr-path-' + privates.cleanName(currentName) + '='+ privates.cleanPath($editedObject.data('edit-attr-path-' + currentName)) + ']');
							$this.html($(this).val());
						} else {
							$this = $('[data-edit-attr-path-' + currentName + '='+ privates.cleanPath($editedObject.data('edit-attr-path-' + currentName)) + ']');
							$this.attr(currentName, $(this).val());
						}
						if (typeof $editedObject.data('edit-attr-source-' + currentName) === 'string') {
							evaluation($editedObject.data('edit-attr-source-' + currentName));
						}
					});
				}
			}

			return function () {
				var name,
					currentName;
				if (i.indexOf('editAttrName') !== -1) {
					name = privates.toDash(i.replace('editAttrName', '')).slice(1);

					if ($popup.find("." + privates.cleanPath($editedObject.data('edit-attr-path-' + name))).length === 0) {
						accept = true;
						$template = $(".edit-atlas--template.as-text");
						$clone = $template.clone().removeClass("edit-atlas--template");
						$clone = publics.cleanDataEditAtlas($clone);
						$popup.find(".edit-atlas--insert").before($clone);
						$clone.find("label").addClass($editedObject.data('edit-attr-path-' + name));
						$clone.find(".edit-atlas--info").html('<span class="as-link">' + $editedObject.data('edit-attr-file-' + name) + "</span> > " + $editedObject.data('edit-attr-path-' + name));
						publics.goToBlock($clone.find(".edit-atlas--info .as-link"));
						if ($editedObject.data('edit-attr-source-' + name)) {
							$clone.find("input").hide();
							NA.socket.emit('source-variation', {
								path: $editedObject.data('edit-attr-path-' + name),
								file: $editedObject.data('edit-attr-file-' + name)
							});
						} else {
							 attrIntoValue($editedObject, $clone, name);
						}
						currentName = currentName || publics.clone(name);
						attrPropagation($editedObject, $clone, name, currentName);
						privates.cancelModificationAttr($editedObject, $clone, currentName);
					}
				}
			};
		}

		if ($editedObject.data("edit-attr") === true) {
			publics.forEach($editedObject.data(), function (i) {
				attrModificationProcess(i)();
			});
			if (accept) {
				publics.targetDataEditAtlas();
				privates.editedObjects.push($editedObject);
			}
		}
	};

	privates.loadData = function ($editedObject, e) {
		var $popup = $(".edit-atlas");

		if ($html.hasClass("is-editable")) {

			if (typeof e !== 'undefined' && document.activeElement.tagName === 'A') {
				e.preventDefault();
			}

			/* Close if click on item */
			setTimeout(function() {
				if (!privates.autoQuit) {
					if (typeof privates.onKeyup !== 'undefined') {
						privates.onKeyup();
					}
					$html.removeClass("is-editable");
				}
			}, 200);
			/* --- */

			$popup.addClass("is-opened");

			privates.editHtml($editedObject, $popup);
			privates.editText($editedObject, $popup);
			privates.editAttr($editedObject, $popup);
		}
	};

	privates.closePopupIfAllCancel = function () {
		var $popup = $(".edit-atlas");
		if ($popup.find(".as-html:not(.edit-atlas--template), .as-text:not(.edit-atlas--template)").length === 0) {
			$popup.removeClass("is-opened");
		}
	};

	publics.targetDataEditAtlas = function () {
		publics.addhocEditAtlas();

		$("[data-edit=true]").each(function () {
			var $currentDataEdit = $(this);

			$currentDataEdit.attr('data-edit-targeted', true);

			$currentDataEdit.click(function (e) {
				privates.loadData($(this), e);
			});
		});
	};

	publics.editContent = function () {
		var $popup = $(".edit-atlas");

		privates.editedObjects = [];

		$(".edit-atlas--full--update").click(function() {
			var options = {
				fileCommon: $(".edit-atlas--variations--common--file").text(),
				fileSpecific: $(".edit-atlas--variations--specific--file").text(),
				contentCommon: $(".edit-atlas--variations--common textarea").val(),
				contentSpecific: $(".edit-atlas--variations--specific textarea").val()
			};
			publics.sendBlock(options);
			publics.sourceBlock();
		});

		$(".edit-atlas--update").click(function () {
			var options = [];

			function addVariationForUpdate(type, options, i) {
				var currentOptions = {},
					name;

				if (privates.editedObjects[i].data('edit-attr') === true) {
					for (var j in privates.editedObjects[i].data()) {
						if (j.indexOf('editAttrName') !== -1) {
							name = privates.toDash(j.replace('editAttrName', '')).slice(1);

							currentOptions = {};

							currentOptions.file = privates.editedObjects[i].data("edit-attr-file-" + name);
							currentOptions.path = privates.editedObjects[i].data("edit-attr-path-" + name);
							currentOptions.type = type;
							currentOptions.source = privates.editedObjects[i].data("edit-attr-source-" + name);
							currentOptions.attrName = name;
							currentOptions.value = $(".edit-atlas ." + privates.cleanPath(privates.editedObjects[i].data("edit-attr-path-" + name))).next().val().trim();

							options.push(currentOptions);
						}
					}
				} else if ($(".edit-atlas ." + privates.cleanPath(privates.editedObjects[i].data("edit-path"))).next().val()) {
					currentOptions = {};
					currentOptions.file = privates.editedObjects[i].data("edit-file");
					currentOptions.path = privates.editedObjects[i].data("edit-path");
					currentOptions.source = privates.editedObjects[i].data("edit-source");
					currentOptions.type = type;
					currentOptions.value = $(".edit-atlas ." + privates.cleanPath(privates.editedObjects[i].data("edit-path"))).next().val().trim();
					options.push(currentOptions);
				}

				return options;
			}

			if (!$html.hasClass("is-editable")) {
				for (var i = 0, l = privates.editedObjects.length; i < l; i++) {
					options = addVariationForUpdate('html', options, i);
					options = addVariationForUpdate('text', options, i);
					options = addVariationForUpdate('attr', options, i);
				}

				publics.sendContent(options);
				if (typeof CKEDITOR !== 'undefined') {
					publics.forEach(CKEDITOR.instances, function (j) {
						CKEDITOR.instances[j].destroy();
					});
				}

				privates.editedObjects = [];
				$(".as-html:not(.edit-atlas--template)").remove();
				$(".as-text:not(.edit-atlas--template)").remove();

				$popup.removeClass("is-opened");
			}
		});

		$(".edit-atlas--close--button").click(function () {
			$popup.removeClass("is-opened");
		});

		publics.targetDataEditAtlas();
	};

	publics.sendContent = function (options) {
		NA.socket.emit('update-variation', options);
	};

	publics.sendBlock = function (options) {
		NA.socket.emit('update-block', options);
	};

	publics.sourceContent = function () {
		NA.socket.on('source-variation', function (data) {
			var $label = $(".edit-atlas ." + privates.cleanPath(data.path)),
				$area = $label.next();
			$label.attr("data-cancel", data.value);
			$area.show();
			$area.val(data.value);
			$area.next().show();
		});
	};

	publics.sourceBlock = function () {
		NA.socket.on('source-block', function (data) {
			$(".edit-atlas--variations--common textarea").val(data.fileCommon);
			$(".edit-atlas--variations--specific textarea").val(data.fileSpecific);
		});
	};

	publics.broadcastContent = function () {
		NA.socket.on('update-variation', function (data) {
			var $this;
			if (data.type === 'html' || data.type === 'text') {
				$('[data-edit-path=' + privates.cleanPath(data.path) + ']').html(data.value);
			}
			if (data.type === 'attr') {
				if (data.attrName === '$text') {
					$this = $('[data-edit-attr-path-' + privates.cleanName(data.attrName) + '=' + privates.cleanPath(data.path) + ']');
					$this.html(data.value);
				} else {
					$this = $('[data-edit-attr-path-' + data.attrName + '=' + privates.cleanPath(data.path) + ']');
					$this.attr(data.attrName, data.value);
				}
			}
			evaluation(data.source);
		});
	};

	publics.broadcastBlock = function () {
		NA.socket.on('update-block', function (data) {
			if (data.status) {
				location.reload();
			}
		});
	};

	publics.listeningKeystroke = function (onKeyup, onKeyDown) {

		function downUp() {
			if (!$html.hasClass("is-editable")) {
				if (typeof onKeyDown !== 'undefined') {
					onKeyDown();
				}
				$html.addClass("is-editable");
			} else {
				if (typeof onKeyup !== 'undefined') {
					privates.onKeyup = onKeyup;
					onKeyup();
				}
				$html.removeClass("is-editable");
			}
		}

		$window.on("keydown", function (e) {
			e = e || event;
			privates.keys[e.keyCode] = true;
			privates.ctrl[e.keyCode] = e.ctrlKey;

			if (privates.ctrl[83] && privates.keys[83] && privates.activate) {
				e.preventDefault();
				if (!privates.auto) {
					privates.auto = true;
					privates.timeout = setTimeout(function () {
						privates.autoQuit = true;
					}, 1000);

					downUp();
				}
			}
		});
		$window.on("keyup", function (e) {
			e = e || event;
			privates.keys[e.keyCode] = false;
			privates.ctrl[e.keyCode] = false;
			privates.auto = false;
			clearTimeout(privates.timeout);

			if (privates.autoQuit) {
				privates.autoQuit = false;
				if (typeof onKeyup !== 'undefined') {
					privates.onKeyup = onKeyup;
					onKeyup();
				}
				$html.removeClass("is-editable");
			}
		});
	};

	publics.goToBlock = function ($source) {
		$source.click(function () {
			$(".edit-atlas").addClass("is-block");
			NA.socket.emit('source-block', {
				fileCommon: $(".edit-atlas--variations").attr("data-variation-common"),
				fileSpecific: $(".edit-atlas--variations").attr("data-variation-specific")
			});
		});
	};

	publics.manageBlockPart = function () {
		var $variations = $(".edit-atlas--variations"),
			$common = $(".edit-atlas--variations--common"),
			$specific = $(".edit-atlas--variations--specific");

		publics.goToBlock($(".edit-atlas--close--switch-block"));
		$(".edit-atlas--close--switch-inline").click(function () {
			$(".edit-atlas").removeClass("is-block");
		});
		$common.mouseover(function () {
			$variations.addClass("for-common");
			$variations.removeClass("for-specific");
		});

		$specific.mouseover(function () {
			$variations.addClass("for-specific");
			$variations.removeClass("for-common");
		});
	};

	publics.editAtlas = function (onKeyup, onKeyDown) {
		publics.editContent();
		publics.manageBlockPart();
		publics.broadcastContent();
		publics.broadcastBlock();
		publics.sourceContent();
		publics.sourceBlock();
		publics.moveEditableArea();
		publics.listeningKeystroke(onKeyup, onKeyDown);
	};
}(website));