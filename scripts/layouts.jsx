#include "es-class.js";
#include "frame_logic.jsx";
#include "constants.jsx";

/* Helper functions */

function determine_card_face(scryfall, card_name) {
    if (scryfall.card_faces[0].name == card_name) {
        return Faces.FRONT;
    } else if (scryfall.card_faces[1].name == card_name) {
        return Faces.BACK;
    }
    throw new Error("Shit broke")
}

/* Class definitions */

var BaseLayout = Class({
    constructor: function (scryfall, card_name) {
        /**
         * Constructor for base layout calls the JSON unpacker to set object parameters from the contents of the JSON (each extending 
         * class needs to implement this) and determines frame colours for the card.
         */

        this.scryfall = scryfall;
        this.card_name_raw = card_name;

        this.unpack_scryfall();
        this.set_card_class();

        var ret = select_frame_layers(this.mana_cost, this.type_line, this.oracle_text, this.colour_identity);

        this.twins = ret.twins;
        this.pinlines = ret.pinlines;
        this.background = ret.background;
        this.is_nyx = ret.is_nyx;  // TODO: determine from frame_effects
        this.is_colourless = ret.is_colourless;
    },
    unpack_scryfall: function () {
        /**
         * Extending classes should implement this method, unpack more information from the provided JSON, and call super(). This base method only unpacks 
         * fields which are common to all layouts.
         * At minimum, the extending class should set this.name, this.oracle_text, this.type_line, and this.mana_cost.
         */

        this.rarity = this.scryfall.rarity;
        this.artist = this.scryfall.artist;
        this.colour_identity = this.scryfall.color_identity;
        this.keywords = "";
        if (this.scryfall.keywords !== undefined) {
            this.keywords = this.scryfall.keywords;
        }
        this.frame_effects = "";
        if (this.scryfall.frame_effects !== undefined) {
            this.frame_effects = this.scryfall.frame_effects;
        }
    },
    get_default_class: function () {
        throw new Error("Default card class not defined!");
    },
    set_card_class: function () {
        /**
         * Set the card's class (finer grained than layout). Used when selecting a template.
         */

        this.card_class = this.get_default_class();
        if (this.type_line.indexOf("Planeswalker") >= 0) {
            this.card_class = planeswalker_class;
        }
        else if (this.type_line.indexOf("Snow") >= 0) {  // frame_effects doesn't contain "snow" for pre-KHM snow cards
            this.card_class = snow_class;
        }
        else if (in_array(this.keywords, "Mutate")) {
            this.card_class = mutate_class;
        } else if (in_array(this.frame_effects, "miracle")) {
            this.card_class = miracle_class;
        }
    }
})

var NormalLayout = Class({
    extends_: BaseLayout,
    unpack_scryfall: function () {
        this.name = this.scryfall.name;
        this.mana_cost = this.scryfall.mana_cost;
        this.type_line = this.scryfall.type_line;
        this.oracle_text = this.scryfall.oracle_text.replace(/\u2212/g, "-");  // for planeswalkers
        this.flavour_text = "";
        if (this.scryfall.flavor_text !== undefined) {
            this.flavour_text = this.scryfall.flavor_text;
        }
        this.power = this.scryfall.power;
        this.toughness = this.scryfall.toughness;
        this.colour_indicator = this.scryfall.color_indicator;  // comes as an array from scryfall

        this.super();
    },
    get_default_class: function () {
        return normal_class;
    },
});

var TransformLayout = Class({
    extends_: BaseLayout,
    unpack_scryfall: function () {
        // TODO: determine which face the card we're dealing with belongs to

        this.face = determine_card_face(this.scryfall, this.card_name_raw);
        this.other_face = -1 * (this.face - 1);

        this.name = this.scryfall.card_faces[this.face].name;
        this.mana_cost = this.scryfall.card_faces[this.face].mana_cost;
        this.type_line = this.scryfall.card_faces[this.face].type_line;
        this.oracle_text = this.scryfall.card_faces[this.face].oracle_text.replace(/\u2212/g, "-");  // for planeswalkers
        this.flavour_text = "";
        if (this.scryfall.card_faces[this.face].flavor_text !== undefined) {
            this.flavour_text = this.scryfall.card_faces[this.face].flavor_text;
        }
        this.power = this.scryfall.card_faces[this.face].power;
        this.other_face_power = this.scryfall.card_faces[this.other_face].power;
        this.toughness = this.scryfall.card_faces[this.face].toughness;
        this.other_face_toughness = this.scryfall.card_faces[this.other_face].toughness;
        this.colour_indicator = this.scryfall.card_faces[this.face].color_indicator;  // comes as an array from scryfall
        this.transform_icon = this.scryfall.frame_effects[0];  // TODO: safe to assume the first frame effect will be the transform icon?

        this.super();
    },
    get_default_class: function () {
        return transform_front_class;
    },

});

var MeldLayout = Class({
    // can we reuse transformlayout?
    extends_: BaseLayout,
    unpack_scryfall: function () {
        // TODO: determine which face the card we're dealing with belongs to

        this.face = determine_card_face(this.scryfall, this.card_name_raw);

        // TODO: save scryfall json fields as properties
        this.name = this.scryfall.card_faces[this.face].name;
        this.mana_cost = this.scryfall.card_faces[this.face].mana_cost;
        this.type_line = this.scryfall.card_faces[this.face].type_line;
        this.oracle_text = this.scryfall.card_faces[this.face].oracle_text.replace(/\u2212/g, "-");  // for planeswalkers
        this.flavour_text = "";
        if (this.scryfall.card_faces[this.face].flavor_text !== undefined) {
            this.flavour_text = this.scryfall.card_faces[this.face].flavor_text;
        }
        this.power = this.scryfall.card_faces[this.face].power;
        this.toughness = this.scryfall.card_faces[this.face].toughness;
        this.colour_indicator = this.scryfall.card_faces[this.face].color_indicator;  // comes as an array from scryfall



        this.super();
    },
    get_default_class: function () {
        return transform_back_class;
    },
});

var ModalDoubleFacedLayout = Class({
    extends_: BaseLayout,
    unpack_scryfall: function () {
        // TODO: determine which face the card we're dealing with belongs to

        this.face = determine_card_face(scryfall, card_name);

        // TODO: save scryfall json fields as properties

        this.super();
    },
    get_default_class: function () {
        return mdfc_front_class;
    },
});

var AdventureLayout = Class({
    extends_: BaseLayout,
    unpack_scryfall: function () {
        this.name = this.scryfall.card_faces[0].name;
        this.mana_cost = this.scryfall.card_faces[0].mana_cost;
        this.type_line = this.scryfall.card_faces[0].type_line;
        this.oracle_text = this.scryfall.card_faces[0].oracle_text;

        this.adventure = {
            name: this.scryfall.card_faces[1].name,
            mana_cost: this.scryfall.card_faces[1].mana_cost,
            type_line: this.scryfall.card_faces[1].type_line,
            oracle_text: this.scryfall.card_faces[1].oracle_text,
        };

        this.flavour_text = "";
        if (this.scryfall.card_faces[0].flavor_text !== undefined) {
            this.flavour_text = this.scryfall.card_faces[0].flavor_text;
        }
        this.power = this.scryfall.power;
        this.toughness = this.scryfall.toughness;
        this.rarity = this.scryfall.rarity;
        this.artist = this.scryfall.artist;

        this.super();
    },
    get_default_class: function () {
        return adventure_class;
    },
});

var PlanarLayout = Class({
    extends_: BaseLayout,
    unpack_scryfall: function () {
        this.name = this.scryfall.name;
        this.mana_cost = "";
        this.type_line = this.scryfall.type_line;
        this.oracle_text = this.scryfall.oracle_text;
        this.rarity = this.scryfall.rarity;
        this.artist = this.scryfall.artist;
        // TODO: save scryfall json fields as properties

        this.super();
    },
    get_default_class: function () {
        return planar_class;
    },
});

var layout_map = {
    "normal": NormalLayout,
    "transform": TransformLayout,
    "meld": MeldLayout,
    "modal_dfc": ModalDoubleFacedLayout,
    "adventure": AdventureLayout,
    "planar": PlanarLayout,
}
