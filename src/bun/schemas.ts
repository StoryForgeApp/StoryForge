import { MessageType, ScalarType, RepeatType, EnumInfo } from "@protobuf-ts/runtime";
import * as v from "valibot";

const BigintFromStringSchema = v.pipe(
  v.union([v.bigint(), v.string(), v.number()]),
  v.transform((val) => {
    if (typeof val === "bigint") return Number(val);
    return Number(val);
  }),
);

const Uint8ArrayFromBase64Schema = v.pipe(
  v.union([v.instance(Uint8Array), v.string()]),
  v.transform((val) => {
    if (val instanceof Uint8Array) return val;
    return Uint8Array.from(atob(val), (c) => c.charCodeAt(0));
  }),
);

// Enums
export const EnumBlockAccessFlags: EnumInfo = [
  "EnumBlockAccessFlags",
  {
    0: "None",
    1: "BuildOrBreak",
    2: "Use",
    4: "Traverse",
  },
];

export const EnumFreeMovAxisLock: EnumInfo = [
  "EnumFreeMovAxisLock",
  {
    0: "None",
    1: "X",
    2: "Y",
    3: "Z",
  },
];

export const EnumGameMode: EnumInfo = [
  "EnumGameMode",
  {
    0: "Guest",
    1: "Survival",
    2: "Creative",
    3: "Spectator",
  },
];

export const EnumPlayStyle: EnumInfo = [
  "EnumPlayStyle",
  {
    0: "WildernessSurvival",
    1: "SurviveAndBuild",
    2: "SurviveAndAutomate",
    3: "CreativeBuilding",
  },
];

// Messages
export interface BlockPos {
  x: number;
  internalY: number;
  z: number;
}

export const BlockPos = new MessageType<BlockPos>("BlockPos", [
  { no: 1, name: "x", kind: "scalar", T: ScalarType.INT32 },
  { no: 2, name: "internal_y", kind: "scalar", T: ScalarType.INT32 },
  { no: 3, name: "z", kind: "scalar", T: ScalarType.INT32 },
]);

export const CuboidiSchema = v.object({
  x1: v.number(),
  y1: v.number(),
  z1: v.number(),
  x2: v.number(),
  y2: v.number(),
  z2: v.number(),
});

export type CuboidiType = v.InferInput<typeof CuboidiSchema>;

export const Cuboidi = new MessageType<CuboidiType>("Cuboidi", [
  { no: 1, name: "x1", kind: "scalar", T: ScalarType.INT32 },
  { no: 2, name: "y1", kind: "scalar", T: ScalarType.INT32 },
  { no: 3, name: "z1", kind: "scalar", T: ScalarType.INT32 },
  { no: 4, name: "x2", kind: "scalar", T: ScalarType.INT32 },
  { no: 5, name: "y2", kind: "scalar", T: ScalarType.INT32 },
  { no: 6, name: "z2", kind: "scalar", T: ScalarType.INT32 },
]);

export interface GeneratedStructure {
  code: string;
  group: string;
  location?: CuboidiType;
  suppressRivulets: boolean;
  suppressTreesAndShrubs: boolean;
}

export const GeneratedStructure = new MessageType<GeneratedStructure>("GeneratedStructure", [
  { no: 1, name: "code", kind: "scalar", T: ScalarType.STRING },
  { no: 2, name: "group", kind: "scalar", T: ScalarType.STRING },
  { no: 3, name: "location", kind: "message", T: () => Cuboidi, opt: true },
  { no: 4, name: "suppress_rivulets", kind: "scalar", T: ScalarType.BOOL },
  {
    no: 5,
    name: "suppress_trees_and_shrubs",
    kind: "scalar",
    T: ScalarType.BOOL,
  },
]);

export interface IntDataMap2d {
  data: number[];
  size: number;
  topLeftPadding: number;
  bottomRightPadding: number;
}

export const IntDataMap2d = new MessageType<IntDataMap2d>("IntDataMap2d", [
  {
    no: 1,
    name: "data",
    kind: "scalar",
    T: ScalarType.INT32,
    repeat: RepeatType.PACKED,
  },
  { no: 2, name: "size", kind: "scalar", T: ScalarType.INT32 },
  { no: 3, name: "top_left_padding", kind: "scalar", T: ScalarType.INT32 },
  { no: 4, name: "bottom_right_padding", kind: "scalar", T: ScalarType.INT32 },
]);

export interface Vec2i {
  x: number;
  y: number;
}

export const Vec2i = new MessageType<Vec2i>("Vec2i", [
  { no: 1, name: "x", kind: "scalar", T: ScalarType.INT32 },
  { no: 2, name: "y", kind: "scalar", T: ScalarType.INT32 },
]);

export interface Vec4i {
  x: number;
  y: number;
  z: number;
  w: number;
}

export const Vec4i = new MessageType<Vec4i>("Vec4i", [
  { no: 1, name: "x", kind: "scalar", T: ScalarType.INT32 },
  { no: 2, name: "y", kind: "scalar", T: ScalarType.INT32 },
  { no: 3, name: "z", kind: "scalar", T: ScalarType.INT32 },
  { no: 4, name: "w", kind: "scalar", T: ScalarType.INT32 },
]);

export interface KeyValuePairVec2iSingle {
  key?: Vec2i;
  value: number;
}

export const KeyValuePairVec2iSingle = new MessageType<KeyValuePairVec2iSingle>(
  "KeyValuePairVec2iSingle",
  [
    { no: 1, name: "key", kind: "message", T: () => Vec2i, opt: true },
    { no: 2, name: "value", kind: "scalar", T: ScalarType.FLOAT },
  ],
);

export const LandClaimSchema = v.object({
  areas: v.array(CuboidiSchema),
  protectionLevel: v.number(),
  ownedByEntityId: v.optional(BigintFromStringSchema),
  ownedByPlayerUid: v.optional(v.string()),
  ownedByPlayerGroupUid: v.optional(v.number()),
  lastKnownOwnerName: v.string(),
  description: v.string(),
  permittedPlayerGroupIds: v.optional(
    v.pipe(
      v.record(v.string(), v.number()),
      v.transform((val) => {
        const result: Record<number, number> = {};
        for (const [k, v] of Object.entries(val)) {
          result[Number(k)] = v;
        }
        return result;
      }),
    ),
  ),
  permittedPlayerUids: v.optional(v.record(v.string(), v.number())),
  permittedPlayerLastKnownPlayerName: v.optional(v.record(v.string(), v.string())),
  allowUseEveryone: v.optional(v.boolean()),
  allowTraverseEveryone: v.optional(v.boolean()),
});

export type LandClaimType = v.InferOutput<typeof LandClaimSchema>;

export const LandClaim = new MessageType<LandClaimType>("LandClaim", [
  {
    no: 1,
    name: "areas",
    kind: "message",
    T: () => Cuboidi,
    repeat: RepeatType.UNPACKED,
  },
  { no: 2, name: "protection_level", kind: "scalar", T: ScalarType.INT32 },
  {
    no: 3,
    name: "owned_by_entity_id",
    kind: "scalar",
    T: ScalarType.INT64,
    L: 0,
  },
  { no: 4, name: "owned_by_player_uid", kind: "scalar", T: ScalarType.STRING },
  {
    no: 5,
    name: "owned_by_player_group_uid",
    kind: "scalar",
    T: ScalarType.UINT32,
  },
  {
    no: 6,
    name: "last_known_owner_name",
    kind: "scalar",
    T: ScalarType.STRING,
  },
  { no: 7, name: "description", kind: "scalar", T: ScalarType.STRING },
  {
    no: 8,
    name: "permitted_player_group_ids",
    kind: "map",
    K: ScalarType.INT32,
    V: { kind: "scalar", T: ScalarType.INT32 },
  },
  {
    no: 9,
    name: "permitted_player_uids",
    kind: "map",
    K: ScalarType.STRING,
    V: { kind: "scalar", T: ScalarType.INT32 },
  },
  {
    no: 10,
    name: "permitted_player_last_known_player_name",
    kind: "map",
    K: ScalarType.STRING,
    V: { kind: "scalar", T: ScalarType.STRING },
  },
  { no: 11, name: "allow_use_everyone", kind: "scalar", T: ScalarType.BOOL },
  {
    no: 12,
    name: "allow_traverse_everyone",
    kind: "scalar",
    T: ScalarType.BOOL,
  },
]);

export interface MapPieceDb {
  pixels: number[];
}

export const MapPieceDb = new MessageType<MapPieceDb>("MapPieceDb", [
  {
    no: 1,
    name: "pixels",
    kind: "scalar",
    T: ScalarType.INT32,
    repeat: RepeatType.PACKED,
  },
]);

export const PlayerSpawnPosSchema = v.object({
  x: v.number(),
  y: v.optional(v.number()),
  z: v.number(),
  yaw: v.number(),
  pitch: v.number(),
  roll: v.number(),
  remainingUses: v.number(),
});

export type PlayerSpawnPosType = v.InferOutput<typeof PlayerSpawnPosSchema>;

export const PlayerSpawnPos = new MessageType<PlayerSpawnPosType>("PlayerSpawnPos", [
  { no: 1, name: "x", kind: "scalar", T: ScalarType.INT32 },
  { no: 2, name: "y", kind: "scalar", T: ScalarType.INT32, opt: true },
  { no: 3, name: "z", kind: "scalar", T: ScalarType.INT32 },
  { no: 4, name: "yaw", kind: "scalar", T: ScalarType.FLOAT },
  { no: 5, name: "pitch", kind: "scalar", T: ScalarType.FLOAT },
  { no: 6, name: "roll", kind: "scalar", T: ScalarType.FLOAT },
  { no: 7, name: "remaining_uses", kind: "scalar", T: ScalarType.INT32 },
]);

export const ServerWorldPlayerDataSchema = v.object({
  playerUid: v.string(),
  inventoriesSerialized: v.record(v.string(), Uint8ArrayFromBase64Schema),
  entityPlayerSerialized: Uint8ArrayFromBase64Schema,
  gameMode: v.number(),
  moveSpeedMultiplier: v.number(),
  freeMove: v.boolean(),
  noClip: v.boolean(),
  viewdistance: v.number(),
  selectedHotbarslot: v.number(),
  freeMovePlaneLock: v.number(),
  pickingRange: v.number(),
  areaSelectionMode: v.boolean(),
  didSelectSkin: v.boolean(),
  spawnPosition: v.optional(PlayerSpawnPosSchema),
  modData: v.record(v.string(), Uint8ArrayFromBase64Schema),
  previousPickingRange: v.number(),
  deaths: v.number(),
  renderMetaBlocks: v.boolean(),
});

export type ServerWorldPlayerDataType = v.InferInput<typeof ServerWorldPlayerDataSchema>;

export const ServerWorldPlayerData = new MessageType<ServerWorldPlayerDataType>(
  "ServerWorldPlayerData",
  [
    { no: 1, name: "player_uid", kind: "scalar", T: ScalarType.STRING },
    {
      no: 2,
      name: "inventories_serialized",
      kind: "map",
      K: ScalarType.STRING,
      V: { kind: "scalar", T: ScalarType.BYTES },
    },
    {
      no: 3,
      name: "entity_player_serialized",
      kind: "scalar",
      T: ScalarType.BYTES,
    },
    { no: 4, name: "game_mode", kind: "enum", T: () => EnumGameMode },
    {
      no: 5,
      name: "move_speed_multiplier",
      kind: "scalar",
      T: ScalarType.FLOAT,
    },
    { no: 6, name: "free_move", kind: "scalar", T: ScalarType.BOOL },
    { no: 7, name: "no_clip", kind: "scalar", T: ScalarType.BOOL },
    { no: 8, name: "viewdistance", kind: "scalar", T: ScalarType.INT32 },
    { no: 9, name: "selected_hotbarslot", kind: "scalar", T: ScalarType.INT32 },
    {
      no: 10,
      name: "free_move_plane_lock",
      kind: "enum",
      T: () => EnumFreeMovAxisLock,
    },
    { no: 11, name: "picking_range", kind: "scalar", T: ScalarType.FLOAT },
    { no: 12, name: "area_selection_mode", kind: "scalar", T: ScalarType.BOOL },
    { no: 13, name: "did_select_skin", kind: "scalar", T: ScalarType.BOOL },
    {
      no: 14,
      name: "spawn_position",
      kind: "message",
      T: () => PlayerSpawnPos,
      opt: true,
    },
    {
      no: 15,
      name: "mod_data",
      kind: "map",
      K: ScalarType.STRING,
      V: { kind: "scalar", T: ScalarType.BYTES },
    },
    {
      no: 16,
      name: "previous_picking_range",
      kind: "scalar",
      T: ScalarType.FLOAT,
    },
    { no: 17, name: "deaths", kind: "scalar", T: ScalarType.INT32 },
    { no: 18, name: "render_meta_blocks", kind: "scalar", T: ScalarType.BOOL },
  ],
);

export const GameDataSchema = v.object({
  mapSizeX: v.number(),
  mapSizeY: v.number(),
  mapSizeZ: v.number(),
  playerDataByUid: v.optional(v.record(v.string(), ServerWorldPlayerDataSchema)),
  seed: v.number(),
  simulationCurrentFrame: v.optional(BigintFromStringSchema),
  lastEntityId: BigintFromStringSchema,
  modData: v.record(v.string(), Uint8ArrayFromBase64Schema),
  totalGameSeconds: BigintFromStringSchema,
  worldName: v.string(),
  totalSecondsPlayed: v.optional(v.number()),
  worldPlayStyle: v.optional(v.number()),
  lastPlayed: v.optional(v.string()),
  createdGameVersion: v.string(),
  gameTimeSpeed: v.optional(v.number()),
  miniDimensionsCreated: v.number(),
  lastSavedGameVersion: v.string(),
  createdByPlayerName: v.optional(v.string()),
  entitySpawning: v.boolean(),
  hoursPerDay: v.number(),
  lastHerdId: BigintFromStringSchema,
  landClaims: v.array(LandClaimSchema),
  timeSpeedModifiers: v.record(v.string(), v.number()),
  playStyle: v.string(),
  worldType: v.string(),
  worldConfigBytes: Uint8ArrayFromBase64Schema,
  playStyleLangCode: v.string(),
  lastBlockItemMappingVersion: v.number(),
  savegameIdentifier: v.string(),
  calendarSpeedMul: v.number(),
  remappingsAppliedByCode: v.record(v.string(), v.boolean()),
  highestChunkdataVersion: v.number(),
  totalGameSecondsStart: BigintFromStringSchema,
  createdWorldGenVersion: v.number(),
  defaultSpawn: v.optional(PlayerSpawnPosSchema),
});

export type GameDataType = v.InferInput<typeof GameDataSchema>;

export const GameData = new MessageType<GameDataType>("GameData", [
  { no: 1, name: "map_size_x", kind: "scalar", T: ScalarType.INT32 },
  { no: 2, name: "map_size_y", kind: "scalar", T: ScalarType.INT32 },
  { no: 3, name: "map_size_z", kind: "scalar", T: ScalarType.INT32 },
  {
    no: 4,
    name: "player_data_by_uid",
    kind: "map",
    K: ScalarType.STRING,
    V: { kind: "message", T: () => ServerWorldPlayerData },
  },
  { no: 7, name: "seed", kind: "scalar", T: ScalarType.INT32 },
  {
    no: 8,
    name: "simulation_current_frame",
    kind: "scalar",
    T: ScalarType.INT64,
    L: 0,
  },
  { no: 10, name: "last_entity_id", kind: "scalar", T: ScalarType.INT64, L: 0 },
  {
    no: 11,
    name: "mod_data",
    kind: "map",
    K: ScalarType.STRING,
    V: { kind: "scalar", T: ScalarType.BYTES },
  },
  {
    no: 12,
    name: "total_game_seconds",
    kind: "scalar",
    T: ScalarType.INT64,
    L: 0,
  },
  { no: 13, name: "world_name", kind: "scalar", T: ScalarType.STRING },
  { no: 14, name: "total_seconds_played", kind: "scalar", T: ScalarType.INT32 },
  { no: 16, name: "world_play_style", kind: "enum", T: () => EnumPlayStyle },
  {
    no: 17,
    name: "last_played",
    kind: "scalar",
    T: ScalarType.STRING,
    opt: true,
  },
  {
    no: 18,
    name: "created_game_version",
    kind: "scalar",
    T: ScalarType.STRING,
  },
  { no: 19, name: "game_time_speed", kind: "scalar", T: ScalarType.INT32 },
  {
    no: 20,
    name: "mini_dimensions_created",
    kind: "scalar",
    T: ScalarType.INT32,
  },
  {
    no: 21,
    name: "last_saved_game_version",
    kind: "scalar",
    T: ScalarType.STRING,
  },
  {
    no: 22,
    name: "created_by_player_name",
    kind: "scalar",
    T: ScalarType.STRING,
  },
  { no: 23, name: "entity_spawning", kind: "scalar", T: ScalarType.BOOL },
  { no: 25, name: "hours_per_day", kind: "scalar", T: ScalarType.FLOAT },
  { no: 26, name: "last_herd_id", kind: "scalar", T: ScalarType.INT64, L: 0 },
  {
    no: 27,
    name: "land_claims",
    kind: "message",
    T: () => LandClaim,
    repeat: RepeatType.UNPACKED,
  },
  {
    no: 28,
    name: "time_speed_modifiers",
    kind: "map",
    K: ScalarType.STRING,
    V: { kind: "scalar", T: ScalarType.FLOAT },
  },
  { no: 29, name: "play_style", kind: "scalar", T: ScalarType.STRING },
  { no: 30, name: "world_type", kind: "scalar", T: ScalarType.STRING },
  { no: 31, name: "world_config_bytes", kind: "scalar", T: ScalarType.BYTES },
  {
    no: 32,
    name: "play_style_lang_code",
    kind: "scalar",
    T: ScalarType.STRING,
  },
  {
    no: 33,
    name: "last_block_item_mapping_version",
    kind: "scalar",
    T: ScalarType.INT32,
  },
  { no: 34, name: "savegame_identifier", kind: "scalar", T: ScalarType.STRING },
  { no: 35, name: "calendar_speed_mul", kind: "scalar", T: ScalarType.FLOAT },
  {
    no: 36,
    name: "remappings_applied_by_code",
    kind: "map",
    K: ScalarType.STRING,
    V: { kind: "scalar", T: ScalarType.BOOL },
  },
  {
    no: 37,
    name: "highest_chunkdata_version",
    kind: "scalar",
    T: ScalarType.INT32,
  },
  {
    no: 38,
    name: "total_game_seconds_start",
    kind: "scalar",
    T: ScalarType.INT64,
    L: 0,
  },
  {
    no: 39,
    name: "created_world_gen_version",
    kind: "scalar",
    T: ScalarType.INT32,
  },
  {
    no: 40,
    name: "default_spawn",
    kind: "message",
    T: () => PlayerSpawnPos,
    opt: true,
  },
]);

export interface MapMarkerPos {
  x: number;
  z: number;
  y: number;
}

export const MapMarkerPos = new MessageType<MapMarkerPos>("MapMarkerPos", [
  { no: 1, name: "x", kind: "scalar", T: ScalarType.DOUBLE },
  { no: 2, name: "z", kind: "scalar", T: ScalarType.DOUBLE },
  { no: 3, name: "y", kind: "scalar", T: ScalarType.DOUBLE },
]);

export interface MapMarker {
  color: number;
  icon: string;
  opacity: bigint;
  playerUid: string;
  number?: bigint;
  position?: MapMarkerPos;
  label: string;
  id: string;
}

export const MapMarker = new MessageType<MapMarker>("MapMarker", [
  { no: 1, name: "color", kind: "scalar", T: ScalarType.UINT32 },
  { no: 2, name: "icon", kind: "scalar", T: ScalarType.STRING },
  { no: 3, name: "opacity", kind: "scalar", T: ScalarType.UINT64, L: 0 },
  { no: 4, name: "player_uid", kind: "scalar", T: ScalarType.STRING },
  {
    no: 5,
    name: "number",
    kind: "scalar",
    T: ScalarType.UINT64,
    opt: true,
    L: 0,
  },
  {
    no: 6,
    name: "position",
    kind: "message",
    T: () => MapMarkerPos,
    opt: true,
  },
  { no: 10, name: "label", kind: "scalar", T: ScalarType.STRING },
  { no: 11, name: "id", kind: "scalar", T: ScalarType.STRING },
]);

export interface MapMarkers {
  markers: MapMarker[];
}

export const MapMarkers = new MessageType<MapMarkers>("MapMarkers", [
  {
    no: 1,
    name: "markers",
    kind: "message",
    T: () => MapMarker,
    repeat: RepeatType.UNPACKED,
  },
]);

export interface ProspectReading {
  depth: number;
  quality: number;
}

export const ProspectReading = new MessageType<ProspectReading>("ProspectReading", [
  { no: 2, name: "depth", kind: "scalar", T: ScalarType.DOUBLE },
  { no: 3, name: "quality", kind: "scalar", T: ScalarType.DOUBLE },
]);

export interface ProspectingResult {
  oreCode: string;
  readings?: ProspectReading;
}

export const ProspectingResult = new MessageType<ProspectingResult>("ProspectingResult", [
  { no: 1, name: "ore_code", kind: "scalar", T: ScalarType.STRING },
  {
    no: 2,
    name: "readings",
    kind: "message",
    T: () => ProspectReading,
    opt: true,
  },
]);

export interface ProspectMarker {
  position?: MapMarkerPos;
  results: ProspectingResult[];
}

export const ProspectMarker = new MessageType<ProspectMarker>("ProspectMarker", [
  {
    no: 1,
    name: "position",
    kind: "message",
    T: () => MapMarkerPos,
    opt: true,
  },
  {
    no: 2,
    name: "results",
    kind: "message",
    T: () => ProspectingResult,
    repeat: RepeatType.UNPACKED,
  },
]);

export interface ProspectingLog {
  markers: ProspectMarker[];
}

export const ProspectingLog = new MessageType<ProspectingLog>("ProspectingLog", [
  {
    no: 1,
    name: "markers",
    kind: "message",
    T: () => ProspectMarker,
    repeat: RepeatType.UNPACKED,
  },
]);
