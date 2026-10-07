import type { DesignFontId } from './data/designOptions'
import type { LayerTransform } from './geometry'

/*
 * Design data per selected item. Plain serializable values only: no Konva nodes, decoded images
 * or object URLs. Keyed by instanceId, then by zoneId; each zone holds at most one text layer and
 * one image layer (image below text, fixed order in V1).
 */

export interface TextDesign {
  /** Exactly as typed (line breaks kept). Blank content is never rendered. */
  content: string
  fontId: DesignFontId
  colorId: string
  transform: LayerTransform
}

export type ImageSource =
  | { kind: 'preset'; presetId: string }
  /** A file chosen on this device; uploadId points to a runtime resource, never a server. */
  | { kind: 'upload'; uploadId: string; fileName: string }

export interface ImageDesign {
  source: ImageSource
  /** Natural width / height of the image. */
  aspectRatio: number
  transform: LayerTransform
}

export interface ZoneDesign {
  text?: TextDesign
  image?: ImageDesign
}

export type LayerKind = 'text' | 'image'

export type DesignState = Readonly<Record<string, Readonly<Record<string, ZoneDesign>>>>

export const emptyDesigns: DesignState = {}

export function getZoneDesign(
  state: DesignState,
  instanceId: string,
  zoneId: string,
): ZoneDesign | undefined {
  return state[instanceId]?.[zoneId]
}

/** Sets or removes (undefined) one layer. Never mutates; drops empty zones and instances. */
export function setLayer<K extends LayerKind>(
  state: DesignState,
  instanceId: string,
  zoneId: string,
  kind: K,
  layer: ZoneDesign[K] | undefined,
): DesignState {
  const zones = { ...state[instanceId] }
  const zone: ZoneDesign = { ...zones[zoneId] }
  if (layer === undefined) delete zone[kind]
  else zone[kind] = layer

  if (zone.text || zone.image) zones[zoneId] = zone
  else delete zones[zoneId]

  const next = { ...state }
  if (Object.keys(zones).length > 0) next[instanceId] = zones
  else delete next[instanceId]
  return next
}

export function removeInstanceDesigns(state: DesignState, instanceId: string): DesignState {
  if (!(instanceId in state)) return state
  const next = { ...state }
  delete next[instanceId]
  return next
}

/** Upload ids referenced by one instance (or by every instance). */
export function uploadIdsOf(state: DesignState, instanceId?: string): string[] {
  const instances = instanceId === undefined ? Object.values(state) : [state[instanceId] ?? {}]
  return instances.flatMap((zones) =>
    Object.values(zones).flatMap((zone) =>
      zone.image?.source.kind === 'upload' ? [zone.image.source.uploadId] : [],
    ),
  )
}
