#include "layouts.jsx";
#include "text_layers.jsx";
#include "constants.jsx";

/* Template boilerplate class
Your entrypoint to customising this project for automating your own templates. You should write classes that extend BaseTemplate for your 
templates, and:
* Override the method template_file_name() to return your template's file name (without extension). It should be located in the
  directory /scripts for the project to find it correctly.
* Extend the constructor (make sure you call this.super() in the constructor). Define the text fields you need to populate in your
  template. Do this by creating new instances of the project's text field classes (see my templates for examples) and append them
  to the array self.text_layers. The constructor also needs to set the property this.art_reference to a layer in your template, and
  your card art will be scaled to match the size of this layer.
* Override the method enable_frame_layers. This method should use information about the card's layout to determine which layers to
  turn on in your template to complete the card's frame. this.layout contains information about the card's twins colour (name and title 
  boxes), pinlines and textbox colour(s), and background colour(s), so you'll be mainly using this. You also know if the card is colourless
  (as in full-art like Eldrazi cards) and whether or not the card is nyx-touched (uses the nyx background).
You should also modify the function select_template() in proxy.jsx to point to your template class(es).

var Template = Class({
    extends_: BaseTemplate,
    template_file_name: function() {
        return "";
    },
    constructor: function(layout, file, file_path) {
        this.super(layout, file, file_path);
        var docref = app.activeDocument;

        // do stuff, including setting this.art_reference
        // add text layers to the array this.text_layers (will be executed automatically)
    },
    enable_frame_layers: function () {
        var docref = app.activeDocument;

        // do stuff
    },
});
*/

var BaseTemplate = Class({
    constructor: function (layout, file, file_path) {
        /**
         * Set up variables for things which are common to all templates (artwork and artist credit).
         * Classes extending this base class are expected to populate the following properties at minimum: this.art_reference
         */

        this.layout = layout;
        this.file = file;

        this.load_template(file_path);

        this.art_layer = app.activeDocument.layers.getByName(default_layer);
        this.legal = app.activeDocument.layers.getByName("Legal");
        this.text_layers = [
            new TextField(
                layer = this.legal.layers.getByName("Artist"),
                text_contents = this.layout.artist,
                text_colour = rgb_white(),
            ),
        ];
    },
    template_file_name: function () {
        /**
         * Return the file name (no extension) for the template .psd file in the /templates folder.
         */

        throw new Error("Template name not specified!");
    },
    template_suffix: function () {
        /**
         * Templates can optionally specify strings to append to the end of cards created by them.
         * For example, extended templates can be set up to automatically append " (Extended)" to the end of 
         * image file names by setting the return value of this method to "Extended";
         */

        return "";
    },
    load_template: function (file_path) {
        /**
         * Opens the template's PSD file in Photoshop.
         */

        var template_path = file_path + "/templates/" + this.template_file_name() + ".psd"
        var template_file = new File(template_path);
        try {
            app.open(template_file);
        } catch (err) {
            throw new Error(
                "\n\nFailed to open the template for this card at the following directory:\n\n"
                + template_path
                + "\n\nCheck your templates folder and try again"
            );
        }
        // TODO: if that's the file that's currently open, reset instead of opening? idk 
    },
    enable_frame_layers: function () {
        /**
         * Enable the correct layers for this card's frame.
         */

        throw new Error("Frame layers not specified!");
    },
    load_artwork: function () {
        /**
         * Loads the specified art file into the specified layer.
         */

        var prev_active_layer = app.activeDocument.activeLayer;

        app.activeDocument.activeLayer = this.art_layer;
        app.load(this.file);
        // note context switch to art file
        app.activeDocument.selection.selectAll();
        app.activeDocument.selection.copy();
        app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);
        // note context switch back to template
        app.activeDocument.paste();

        // return document to previous state
        app.activeDocument.activeLayer = prev_active_layer;
    },
    execute: function () {
        /**
         * Perform actions to populate this template. Load and frame artwork, enable frame layers, and execute all text layers.
         * Returns the file name of the image w/ the template's suffix if it specified one.
         * Don't override this method! You should be able to specify the full behaviour of the template in the constructor (making 
         * sure to call this.super()) and enable_frame_layers().
         */

        this.load_artwork();
        frame_layer(this.art_layer, this.art_reference);
        this.enable_frame_layers();
        for (var i = 0; i < this.text_layers.length; i++) {
            this.text_layers[i].execute();
        }
        var file_name = this.layout.name;
        var suffix = this.template_suffix();
        if (suffix !== "") {
            file_name = file_name + " (" + suffix + ")";
        }

        return file_name;
    },
});

/* Class definitions for Chilli_Axe templates */

var ChilliBaseTemplate = Class({
    /**
     * A BaseTemplate with a few extra features I didn't want to pollute the base template for other people with.
     */

    extends_: BaseTemplate,
    // TODO: add code for transform and mdfc stuff here (since both normal and planeswalker templates need to inherit them)
    basic_text_layers: function (text_and_icons) {
        /**
         * Set up the card's mana cost, name (scaled to not overlap with mana cost), expansion symbol, and type line
         * (scaled to not overlap with the expansion symbol).
         */

        var name = text_and_icons.layers.getByName("Card Name");
        if (this.name_shifted) {
            name.visible = false;
            name = text_and_icons.layers.getByName("Card Name Shift");
            name.visible = true;
        }
        var mana_cost = text_and_icons.layers.getByName("Mana Cost");
        var expansion_symbol = text_and_icons.layers.getByName("Expansion Symbol");
        var type_line = text_and_icons.layers.getByName("Typeline");
        if (this.typeline_shifted) {
            type_line.visible = false;
            type_line = text_and_icons.layers.getByName("Typeline Shift");
            type_line.visible = true;

            // enable colour indicator dot
            app.activeDocument.layers.getByName("Colour Indicator").layers.getByName(this.layout.pinlines).visible = true;
        }
        this.text_layers = this.text_layers.concat([
            new BasicFormattedTextField(
                layer = mana_cost,
                text_contents = this.layout.mana_cost,
                text_colour = rgb_black(),
            ),
            new ScaledTextField(
                layer = name,
                text_contents = this.layout.name,
                text_colour = get_text_layer_colour(name),
                reference_layer = mana_cost,
            ),
            new ExpansionSymbolField(
                layer = expansion_symbol,
                text_contents = expansion_symbol_character,
                rarity = this.layout.rarity,
            ),
            new ScaledTextField(
                layer = type_line,
                text_contents = this.layout.type_line,
                text_colour = get_text_layer_colour(type_line),
                reference_layer = expansion_symbol,
            ),
        ]);
    },
    enable_hollow_crown: function (crown, pinlines) {
        /**
         * Enable the hollow legendary crown for this card given layer groups for the crown and pinlines.
         */

        var docref = app.activeDocument;
        docref.activeLayer = crown;
        enable_active_layer_mask();
        docref.activeLayer = pinlines;
        enable_active_layer_mask();
        docref.activeLayer = docref.layers.getByName("Shadows");
        enable_active_layer_mask();
        docref.layers.getByName("Hollow Crown Shadow").visible = true;
    },

})

var NormalTemplate = Class({
    /**
     * Normal M15-style template.
     */

    extends_: ChilliBaseTemplate,
    template_file_name: function () {
        return "normal";
    },
    rules_text_and_pt_layers: function (text_and_icons) {
        /**
         * Set up the card's rules text and power/toughness according to whether or not the card is a creature.
         * You're encouraged to override this method if a template extending this one doesn't have the option for
         * creating creature cards (e.g. miracles).
         */

        // centre the rules text if the card has no flavour text, text is all on one line, and that line is fairly short
        var is_centred = this.layout.flavour_text.length <= 1 && this.layout.oracle_text.length <= 70 && this.layout.oracle_text.indexOf("\r") < 0;

        var noncreature_signature = this.legal.layers.getByName("Noncreature MPC Autofill");
        var creature_signature = this.legal.layers.getByName("Creature MPC Autofill");

        var power_toughness = text_and_icons.layers.getByName("Power / Toughness");
        if (this.is_creature) {
            // creature card - set up creature layer for rules text and insert power & toughness
            var rules_text = text_and_icons.layers.getByName("Rules Text - Creature");
            this.text_layers = this.text_layers.concat([
                new TextField(
                    layer = power_toughness,
                    text_contents = this.layout.power.toString() + "/" + this.layout.toughness.toString(),
                    text_colour = get_text_layer_colour(power_toughness),
                ),
                new CreatureFormattedTextArea(
                    layer = rules_text,
                    text_contents = this.layout.oracle_text,
                    text_colour = get_text_layer_colour(rules_text),
                    flavour_text = this.layout.flavour_text,
                    reference_layer = text_and_icons.layers.getByName("Textbox Reference"),
                    is_centred = is_centred,
                    pt_reference_layer = text_and_icons.layers.getByName("PT Adjustment Reference"),
                    pt_top_reference_layer = text_and_icons.layers.getByName("PT Top Reference"),
                ),
            ]);

            noncreature_signature.visible = false;
            creature_signature.visible = true;
        } else {
            // noncreature card - use the normal rules text layer and disable the power/toughness layer
            var rules_text = text_and_icons.layers.getByName("Rules Text - Noncreature");
            this.text_layers.push(
                new FormattedTextArea(
                    layer = rules_text,
                    text_contents = this.layout.oracle_text,
                    text_colour = get_text_layer_colour(rules_text),
                    flavour_text = this.layout.flavour_text,
                    is_centred = is_centred,
                    reference_layer = text_and_icons.layers.getByName("Textbox Reference"),
                ),
            );

            power_toughness.visible = false;
        }
    },
    constructor: function (layout, file, file_path) {
        this.super(layout, file, file_path);

        var docref = app.activeDocument;

        this.art_reference = docref.layers.getByName("Art Frame");
        if (this.layout.is_colourless) this.art_reference = docref.layers.getByName("Full Art Frame");

        this.is_creature = this.layout.power !== undefined && this.layout.toughness !== undefined;
        this.is_legendary = this.layout.type_line.indexOf("Legendary") >= 0;
        this.is_land = this.layout.type_line.indexOf("Land") >= 0;
        this.is_companion = this.layout.frame_effects.indexOf("companion") >= 0;

        this.name_shifted = false;  // override and set this to true for transform cards
        this.typeline_shifted = this.layout.colour_indicator !== null && this.layout.colour_indicator !== undefined;

        var text_and_icons = docref.layers.getByName("Text and Icons");
        this.basic_text_layers(text_and_icons);
        this.rules_text_and_pt_layers(text_and_icons);
    },
    enable_frame_layers: function () {
        var docref = app.activeDocument;

        // twins and pt box
        var twins = docref.layers.getByName("Name & Title Boxes");
        twins.layers.getByName(this.layout.twins).visible = true;
        if (this.is_creature) {
            var pt_box = docref.layers.getByName("PT Box");
            pt_box.layers.getByName(this.layout.twins).visible = true;
        }

        // pinlines
        var pinlines = docref.layers.getByName("Pinlines & Textbox");
        if (this.is_land) {
            pinlines = docref.layers.getByName("Land Pinlines & Textbox");
        }
        pinlines.layers.getByName(this.layout.pinlines).visible = true;

        // background
        var background = docref.layers.getByName("Background");
        if (this.layout.is_nyx) {
            background = docref.layers.getByName("Nyx");
        }
        background.layers.getByName(this.layout.background).visible = true;

        if (this.is_legendary) {
            // legendary crown
            var crown = docref.layers.getByName("Legendary Crown");
            crown.layers.getByName(this.layout.pinlines).visible = true;
            border = docref.layers.getByName("Border");
            border.layers.getByName("Normal Border").visible = false;
            border.layers.getByName("Legendary Border").visible = true;
        }

        if (this.is_companion) {
            // enable companion texture
            var companion = docref.layers.getByName("Companion");
            companion.layers.getByName(this.layout.pinlines).visible = true;
        }

        if ((this.is_legendary && this.layout.is_nyx) || this.is_companion) {
            // legendary crown on nyx background - enable the hollow crown shadow and layer mask on crown, pinlines, and shadows
            this.enable_hollow_crown(crown, pinlines);
        }
    },
});

/* Templates similar to NormalTemplate but with aesthetic differences */

var NormalExtendedTemplate = Class({
    /**
     * An extended-art version of the normal template. The layer structure of this template and NormalTemplate are identical.
     */

    extends_: NormalTemplate,
    template_file_name: function () {
        return "normal-extended";
    },
    template_suffix: function () {
        return "Extended";
    },
    constructor: function (layout, file, file_path) {
        // strip out reminder text for extended cards
        layout.oracle_text = strip_reminder_text(layout.oracle_text);
        this.super(layout, file, file_path);
    }
});

var WomensDayTemplate = Class({
    /**
     * The showcase template first used on the Women's Day Secret Lair. The layer structure of this template and NormalTemplate are
     * similar, but this template doesn't have any background layers, and a layer mask on the pinlines group needs to be enabled when
     * the card is legendary.
     */

    extends_: NormalTemplate,
    template_file_name: function () {
        return "womensday";
    },
    template_suffix: function () {
        return "Showcase";
    },
    constructor: function (layout, file, file_path) {
        // strip out reminder text
        layout.oracle_text = strip_reminder_text(layout.oracle_text);
        this.super(layout, file, file_path);
    },
    enable_frame_layers: function () {
        var docref = app.activeDocument;

        // twins and pt box
        var twins = docref.layers.getByName("Name & Title Boxes");
        twins.layers.getByName(this.layout.twins).visible = true;
        if (this.is_creature) {
            var pt_box = docref.layers.getByName("PT Box");
            pt_box.layers.getByName(this.layout.twins).visible = true;
        }

        // pinlines
        var pinlines = docref.layers.getByName("Pinlines & Textbox");
        if (this.is_land) {
            pinlines = docref.layers.getByName("Land Pinlines & Textbox");
        }
        pinlines.layers.getByName(this.layout.pinlines).visible = true;

        if (this.is_legendary) {
            // legendary crown
            var crown = docref.layers.getByName("Legendary Crown");
            crown.layers.getByName(this.layout.pinlines).visible = true;
            docref.activeLayer = pinlines;
            enable_active_layer_mask();
        }
    },
});

var StargazingTemplate = Class({
    /**
     * Stargazing template from Theros: Beyond Death showcase cards. The layer structure of this template and NormalTemplate are largely 
     * identical, but this template doesn't have normal background textures, only the Nyxtouched ones.
     */

    extends_: NormalTemplate,
    template_file_name: function () {
        return "stargazing";
    },
    template_suffix: function () {
        return "Stargazing";
    },
    constructor: function (layout, file, file_path) {
        layout.oracle_text = strip_reminder_text(layout.oracle_text);
        layout.is_nyx = true;
        this.super(layout, file, file_path);
    }
});

var MasterpieceTemplate = Class({
    /**
     * Kaladesh Invention template. This template has stripped-down layers compared to NormalTemplate but is otherwise similar.
     */

    extends_: NormalTemplate,
    template_file_name: function () {
        return "masterpiece";
    },
    template_suffix: function () {
        return "Masterpiece";
    },
    constructor: function (layout, file, file_name) {
        is_colourless = false;
        // force to use bronze twins and background
        layout.twins = "Bronze";
        layout.background = "Bronze";
        layout.oracle_text = strip_reminder_text(layout.oracle_text);
        this.super(layout, file, file_name);
    },
    enable_frame_layers: function () {
        this.super();
        if (this.is_legendary) {
            // always enable hollow crown for legendary cards in this template
            var crown = app.activeDocument.layers.getByName("Legendary Crown");
            var pinlines = app.activeDocument.layers.getByName("Pinlines & Textbox");
            this.enable_hollow_crown(crown, pinlines);
        }
    }
});

var ExpeditionTemplate = Class({
    /**
     * Zendikar Rising Expedition template. Doesn't have a mana cost layer, support creature cards, masks pinlines for legendary
     * cards like WomensDayTemplate, and has a single static background layer.
     */

    extends_: NormalTemplate,
    template_file_name: function () {
        return "znrexp";
    },
    template_suffix: function () {
        return "Expedition";
    },
    constructor: function (layout, file, file_path) {
        // strip out reminder text
        layout.oracle_text = strip_reminder_text(layout.oracle_text);
        this.super(layout, file, file_path);
    },
    basic_text_layers: function (text_and_icons) {
        var name = text_and_icons.layers.getByName("Card Name");
        var expansion_symbol = text_and_icons.layers.getByName("Expansion Symbol");
        var type_line = text_and_icons.layers.getByName("Typeline");
        this.text_layers = this.text_layers.concat([
            new TextField(
                layer = name,
                text_contents = this.layout.name,
                text_colour = get_text_layer_colour(name),
            ),
            new ExpansionSymbolField(
                layer = expansion_symbol,
                text_contents = expansion_symbol_character,
                rarity = this.layout.rarity,
            ),
            new ScaledTextField(
                layer = type_line,
                text_contents = this.layout.type_line,
                text_colour = get_text_layer_colour(type_line),
                reference_layer = expansion_symbol,
            ),
        ]);
    },
    rules_text_and_pt_layers: function (text_and_icons) {
        // overriding this because the expedition template doesn't have power/toughness layers
        var rules_text = text_and_icons.layers.getByName("Rules Text - Noncreature")
        this.text_layers.push(
            new FormattedTextArea(
                layer = rules_text,
                text_contents = this.layout.oracle_text,
                text_colour = get_text_layer_colour(rules_text),
                flavour_text = this.layout.flavour_text,
                is_centred = false,
                reference_layer = text_and_icons.layers.getByName("Textbox Reference"),
            ),
        );
    },
    enable_frame_layers: function () {
        var docref = app.activeDocument;

        // twins and pt box
        var twins = docref.layers.getByName("Name & Title Boxes");
        twins.layers.getByName(this.layout.twins).visible = true;

        // pinlines
        var pinlines = docref.layers.getByName("Land Pinlines & Textbox");
        pinlines.layers.getByName(this.layout.pinlines).visible = true;

        if (this.is_legendary) {
            // legendary crown
            var crown = docref.layers.getByName("Legendary Crown");
            crown.layers.getByName(this.layout.pinlines).visible = true;
            docref.activeLayer = pinlines;
            enable_active_layer_mask();
            border = docref.layers.getByName("Border");
            border.layers.getByName("Normal Border").visible = false;
            border.layers.getByName("Legendary Border").visible = true;
        }
    },
});

var IxalanTemplate = Class({
    /**
     * Template for the back faces of transforming cards from Ixalan block.
     */

    extends_: NormalTemplate,
    template_file_name: function () {
        return "ixalan";
    },
    basic_text_layers: function (text_and_icons) {
        // typeline doesn't scale down with expansion symbol, and no mana cost layer
        var name = text_and_icons.layers.getByName("Card Name");
        var expansion_symbol = text_and_icons.layers.getByName("Expansion Symbol");
        var type_line = text_and_icons.layers.getByName("Typeline");
        this.text_layers = this.text_layers.concat([
            new TextField(
                layer = name,
                text_contents = this.layout.name,
                text_colour = get_text_layer_colour(name),
            ),
            new ExpansionSymbolField(
                layer = expansion_symbol,
                text_contents = expansion_symbol_character,
                rarity = this.layout.rarity,
            ),
            new TextField(
                layer = type_line,
                text_contents = this.layout.type_line,
                text_colour = get_text_layer_colour(type_line),
            ),
        ]);
    },
    rules_text_and_pt_layers: function (text_and_icons) {
        // overriding this because the ixalan template doesn't have power/toughness layers
        var rules_text = text_and_icons.layers.getByName("Rules Text - Noncreature");
        this.text_layers.push(
            new FormattedTextArea(
                layer = rules_text,
                text_contents = this.layout.oracle_text,
                text_colour = get_text_layer_colour(rules_text),
                flavour_text = this.layout.flavour_text,
                is_centred = false,
                reference_layer = text_and_icons.layers.getByName("Textbox Reference"),
            ),
        );
    },
    enable_frame_layers: function () {
        var background = app.activeDocument.layers.getByName("Background");
        background.layers.getByName(this.layout.background).visible = true;
    },
});

var SnowTemplate = Class({
    /**
     * A snow template with textures from Kaldheim's snow cards. The layer structure of this template and NormalTemplate are identical.
     */

    extends_: NormalTemplate,
    template_file_name: function () {
        return "snow";
    },
});

var MiracleTemplate = new Class({
    /**
     * A template for miracle cards. The layer structure of this template and NormalTemplate are close to identical, but this
     * template is stripped down to only include mono-coloured layers and no land layers or other special layers, but no miracle
     * cards exist that require these layers.
     */

    extends_: NormalTemplate,
    template_file_name: function () {
        return "miracle";
    },
    rules_text_and_pt_layers: function (text_and_icons) {
        // overriding this because the miracle template doesn't have power/toughness layers
        var rules_text = text_and_icons.layers.getByName("Rules Text - Noncreature")
        this.text_layers.push(
            new FormattedTextArea(
                layer = rules_text,
                text_contents = this.layout.oracle_text,
                text_colour = get_text_layer_colour(rules_text),
                flavour_text = this.layout.flavour_text,
                is_centred = false,
                reference_layer = text_and_icons.layers.getByName("Textbox Reference"),
            ),
        );
    },
});


/* Templates similar to NormalTemplate with new features */

var MutateTemplate = Class({
    /**
     * A template for Ikoria's mutate cards.  The layer structure of this template and NormalTemplate are close to identical, but this
     * template has a couple more text and reference layers for the top half of the textbox. It also doesn't include layers for Nyx
     * backgrounds or Companion crowns, but no mutate cards exist that would require these layers.
     */

    extends_: NormalTemplate,
    template_file_name: function () {
        return "mutate";
    },
    constructor: function (layout, file, file_path) {
        // split this.oracle_text between mutate text and actual text before calling this.super()
        var split_rules_text = layout.oracle_text.split("\n");
        layout.mutate_text = split_rules_text[0];
        layout.oracle_text = split_rules_text.slice(1, split_rules_text.length).join("\n");

        this.super(layout, file, file_path);

        var docref = app.activeDocument;
        var text_and_icons = docref.layers.getByName("Text and Icons");
        var mutate = text_and_icons.layers.getByName("Mutate");
        this.text_layers.push(
            new FormattedTextArea(
                layer = mutate,
                text_contents = this.layout.mutate_text,
                text_colour = get_text_layer_colour(mutate),
                flavour_text = this.layout.flavour_text,
                is_centred = false,
                reference_layer = text_and_icons.layers.getByName("Mutate Reference"),
            )
        );
    }
});

var AdventureTemplate = Class({
    /**
     * A template for Eldraine adventure cards. The layer structure of this template and NormalTemplate are close to identical, but this
     * template has a couple more text and reference layers for the left half of the textbox. It also doesn't include layers for Nyx 
     * backgrounds or Companion crowns, but no adventure cards exist that would require these layers.
     */

    extends_: NormalTemplate,
    template_file_name: function () {
        return "adventure";
    },
    constructor: function (layout, file, file_path) {
        this.super(layout, file, file_path);

        // add adventure name, mana cost, type line, and rules text fields to this.text_layers
        var docref = app.activeDocument;
        var text_and_icons = docref.layers.getByName("Text and Icons");
        var name = text_and_icons.layers.getByName("Card Name - Adventure");
        var mana_cost = text_and_icons.layers.getByName("Mana Cost - Adventure");
        var rules_text = text_and_icons.layers.getByName("Rules Text - Adventure");
        var type_line = text_and_icons.layers.getByName("Typeline - Adventure");
        this.text_layers = this.text_layers.concat([
            new BasicFormattedTextField(
                layer = mana_cost,
                text_contents = this.layout.adventure.mana_cost,
                text_colour = rgb_black(),
            ),
            new ScaledTextField(
                layer = name,
                text_contents = this.layout.adventure.name,
                text_colour = get_text_layer_colour(name),
                reference_layer = mana_cost,
            ),
            new FormattedTextArea(
                layer = rules_text,
                text_contents = this.layout.adventure.oracle_text,
                text_colour = get_text_layer_colour(rules_text),
                flavour_text = "",
                is_centred = false,
                reference_layer = text_and_icons.layers.getByName("Textbox Reference - Adventure"),
            ),
            new TextField(
                layer = type_line,
                text_contents = this.layout.adventure.type_line,
                text_colour = get_text_layer_colour(type_line),
            ),
        ]);
    }
});

/* Planeswalker templates */

var PlaneswalkerTemplate = Class({
    /**
     * Planeswalker template - 3 or 4 loyalty abilities.
     */

    extends_: ChilliBaseTemplate,
    template_file_name: function () {
        return "pw";
    },
    constructor: function (layout, file, file_path) {
        this.super(layout, file, file_path);

        exit_early = true;

        this.art_reference = app.activeDocument.layers.getByName("Planeswalker Art Frame");
        if (this.layout.is_colourless) this.art_reference = app.activeDocument.layers.getByName("Full Art Frame");

        var ability_array = this.layout.oracle_text.split("\n");
        var num_abilities = 3;
        if (ability_array.length > 3) num_abilities = 4;

        // docref for everything but legal and art reference is based on number of abilities
        this.docref = app.activeDocument.layers.getByName("pw-" + num_abilities.toString());
        this.docref.visible = true;

        var text_and_icons = this.docref.layers.getByName("Text and Icons");
        this.basic_text_layers(text_and_icons);

        // planeswalker ability layers
        var group_names = ["First Ability", "Second Ability", "Third Ability", "Fourth Ability"];
        var loyalty_group = this.docref.layers.getByName("Loyalty Graphics");
        var ability_group;

        for (var i = 0; i < ability_array.length; i++) {
            ability_group = loyalty_group.layers.getByName(group_names[i]);

            var ability_text = ability_array[i];
            var static_text_layer = ability_group.layers.getByName("Static Text");
            var ability_text_layer = ability_group.layers.getByName("Ability Text");
            var ability_layer = ability_text_layer;
            var colon_index = ability_text.indexOf(": ");

            // determine if this is a static or activated ability by the presence of ":" in the start of the ability
            if (colon_index > 0 && colon_index < 5) {
                // activated ability

                // determine which loyalty group to enable, and set the loyalty symbol's text
                var loyalty_graphic = ability_group.layers.getByName(ability_text[0]);
                loyalty_graphic.visible = true;
                this.text_layers.push(
                    new TextField(
                        layer = loyalty_graphic.layers.getByName("Cost"),
                        text_contents = ability_text.slice(0, colon_index),
                        text_colour = rgb_white(),
                    )
                );

                ability_text = ability_text.slice(colon_index + 2);

            } else {
                // static ability
                ability_layer = static_text_layer;
                ability_text_layer.visible = false;
                static_text_layer.visible = true;
            }
            this.text_layers.push(
                new BasicFormattedTextField(
                    layer = ability_layer,
                    text_contents = ability_text,
                    text_colour = get_text_layer_colour(ability_layer),
                )
            );
        }

        // starting loyalty
        this.text_layers.push(
            new TextField(
                layer = loyalty_group.layers.getByName("Starting Loyalty").layers.getByName("Text"),
                text_contents = this.layout.scryfall.loyalty,
                text_colour = rgb_white(),
            ),
        );
    },
    enable_frame_layers: function () {
        // twins and pt box
        var twins = this.docref.layers.getByName("Name & Title Boxes");
        twins.layers.getByName(this.layout.twins).visible = true;

        // pinlines
        var pinlines = this.docref.layers.getByName("Pinlines");
        pinlines.layers.getByName(this.layout.pinlines).visible = true;

        // background
        this.enable_background();

    },
    enable_background: function () {
        var background = this.docref.layers.getByName("Background");
        background.layers.getByName(this.layout.background).visible = true;
    }
});

var PlaneswalkerExtendedTemplate = Class({
    /**
     * An extended version of PlaneswalkerTemplate. Functionally identical except for the lack of background textures.
     */

    extends_: PlaneswalkerTemplate,
    template_file_name: function () {
        return "pw-extended";
    },
    enable_background: function () { },
});

/* Misc. templates */

var PlanarTemplate = Class({
    extends_: BaseTemplate,
    template_file_name: function () {
        return "planar";
    },
    constructor: function (layout, file, file_path) {
        this.super(layout, file, file_path);
        exit_early = true;

        var docref = app.activeDocument;
        this.art_reference = docref.layers.getByName("Art Frame");
        // artist
        replace_text(docref.layers.getByName("Legal").layers.getByName("Artist"), "Artist", this.layout.artist);

        // card name, type line, expansion symbol
        var text_and_icons = docref.layers.getByName("Text and Icons");
        var name = text_and_icons.layers.getByName("Card Name");
        var type_line = text_and_icons.layers.getByName("Typeline");
        var expansion_symbol = text_and_icons.layers.getByName("Expansion Symbol");

        // note: overwriting this.text_layers because the paintbrush symbol is part of the artist text layer, so we inserted the
        // artist name separately earlier with replace_text(), and the artist usually comes for free with this.text_layers.
        this.text_layers = [
            new TextField(
                layer = name,
                text_contents = this.layout.name,
                text_colour = get_text_layer_colour(name),
            ),
            new ScaledTextField(
                layer = type_line,
                text_contents = this.layout.type_line,
                text_colour = get_text_layer_colour(type_line),
                reference_layer = expansion_symbol,
            )
        ];

        var static_ability = text_and_icons.layers.getByName("Static Ability");
        var chaos_ability = text_and_icons.layers.getByName("Chaos Ability");

        if (this.layout.type_line === "Phenomenon") {
            // phenomenon card - insert oracle text into static ability layer and disable chaos ability & layer mask on textbox
            this.text_layers.push(
                new BasicFormattedTextField(
                    layer = static_ability,
                    text_contents = this.layout.oracle_text,
                    text_colour = get_text_layer_colour(static_ability),
                )
            );
            var textbox = docref.layers.getByName("Textbox");
            docref.activeLayer = textbox;
            disable_active_layer_mask();
            text_and_icons.layers.getByName("Chaos Symbol").visible = false;
            chaos_ability.visible = false;
        } else {
            // plane card - split oracle text on last line break, insert everything before it into static ability layer and the rest
            // into chaos ability layer
            var linebreak_index = this.layout.oracle_text.lastIndexOf("\n");
            this.text_layers = this.text_layers.concat([
                new BasicFormattedTextField(
                    layer = static_ability,
                    text_contents = this.layout.oracle_text.slice(0, linebreak_index),
                    text_colour = get_text_layer_colour(static_ability),
                ),
                new BasicFormattedTextField(
                    layer = chaos_ability,
                    text_contents = this.layout.oracle_text.slice(linebreak_index + 1),
                    text_colour = get_text_layer_colour(chaos_ability),
                ),
            ]);
        }
    },
    enable_frame_layers: function () { },
});

var BasicLandTemplate = Class({
    /**
     * Basic land template - no text and icons (aside from legal), just a layer for each of the eleven basic lands.
     */

    extends_: BaseTemplate,
    template_file_name: function () {
        return "basic";
    },
    template_suffix: function () {
        return this.layout.artist;
    },
    constructor: function (layout, file, file_path) {
        this.super(layout, file, file_path);

        this.art_reference = app.activeDocument.layers.getByName("Basic Art Frame");
    },
    enable_frame_layers: function () {
        app.activeDocument.layers.getByName(this.layout.name).visible = true;
    },
});

var BasicLandTherosTemplate = Class({
    /**
     * Basic land template for the full-art Nyx basics from Theros: Beyond Death.
     */

    extends_: BasicLandTemplate,
    template_file_name: function () {
        return "basic-theros";
    },
});

var BasicLandUnstableTemplate = Class({
    /**
     * Basic land template for the borderless basics from Unstable.
     */

    extends_: BasicLandTemplate,
    template_file_name: function () {
        return "basic-unstable";
    },
});