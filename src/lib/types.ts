import type { default as Layer } from 'ol/layer/Layer';
import type VectorLayer from 'ol/layer/Vector';
import type VectorSource from 'ol/source/Vector';
import type Source from 'ol/source/Source';
import type { Style } from 'ol/style';
import type Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';

export interface MapLayer {
  id: string;
  name: string;
  olLayer: Layer<Source, any>;
  visible: boolean;
  opacity: number;
  type: 'wms' | 'wfs' | 'vector' | 'osm' | 'drawing' | 'sentinel' | 'landsat' | 'gee';
  isDeas?: boolean;
}

export interface VectorMapLayer extends MapLayer {
  olLayer: VectorLayer<VectorSource<Feature<Geometry>>>;
}

export interface OSMCategoryConfig {
  id: string;
  name: string;
  overpassQueryFragment: (bboxStr: string) => string;
  matcher: (tags: Record<string, any>) => boolean;
  style: Style;
}

export interface GeoServerDiscoveredLayer {
  name: string;
  title: string;
  bbox?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  styleName?: string;
  wmsAddedToMap: boolean;
  wfsAddedToMap: boolean;
}

export interface BaseLayerOptionForSelect {
  id: string;
  name: string;
}

export interface BaseLayerSettings {
  opacity: number;
  brightness: number;
  contrast: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[]; // [southLat, northLat, westLon, eastLon]
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
}
