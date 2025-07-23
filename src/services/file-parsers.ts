
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import * as JSZip from 'jszip';
import shp from 'shpjs';
import { nanoid } from 'nanoid';
import type { MapLayer } from '@/lib/types';
import type { Toast } from '@/hooks/use-toast';
import type Feature from 'ol/Feature';

interface FileUploadParams {
    selectedFile: File | null;
    selectedMultipleFiles: FileList | null;
    onAddLayer: (layer: MapLayer) => void;
    toast: (options: Parameters<typeof Toast>[0]) => void;
    uniqueIdPrefix: string;
}

const getFileExtension = (filename: string): string => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
};

const getBaseName = (filename: string): string => {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
};

const createVectorLayer = (features: Feature[], layerName: string): MapLayer => {
    // Ensure all features have a unique ID for selection to work correctly.
    features.forEach(feature => {
        if (!feature.getId()) {
            feature.setId(nanoid());
        }
    });

    const source = new VectorSource({ features });
    const layerId = `${layerName}-${nanoid()}`;
    const olLayer = new VectorLayer({
        source,
        properties: { id: layerId, name: layerName, type: 'vector' },
    });
    return {
        id: layerId,
        name: layerName,
        olLayer,
        visible: true,
        opacity: 1,
        type: 'vector',
    };
};

export const handleFileUpload = async ({
    selectedFile,
    selectedMultipleFiles,
    onAddLayer,
    toast,
}: FileUploadParams): Promise<void> => {

    const geojsonFormat = new GeoJSON({ featureProjection: 'EPSG:3857' });
    const kmlFormat = new KML({ extractStyles: true, showPointNames: true });

    // This function processes a single file content and adds it to the map
    const processAndAddLayer = async (content: string | ArrayBuffer, file: File, layerNameOverride?: string) => {
        const fileExtension = getFileExtension(file.name);
        const nameForLayer = layerNameOverride || getBaseName(file.name);
        let features: Feature[] | undefined;

        try {
            switch (fileExtension) {
                case 'geojson':
                case 'json':
                    features = geojsonFormat.readFeatures(content as string);
                    break;
                case 'kml':
                    features = kmlFormat.readFeatures(content as string, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
                    break;
                case 'zip':
                case 'kmz': {
                    let geojsonData: any;
                    try {
                        geojsonData = await shp(content as ArrayBuffer);
                    } catch (shpError) {
                        // Fallback for KMZ files that are not shapefile zips
                        if (fileExtension === 'kmz') {
                            try {
                                const zip = await JSZip.loadAsync(content as ArrayBuffer);
                                const kmlFile = Object.values(zip.files).find(f => getFileExtension(f.name) === 'kml' && !f.dir);
                                if (!kmlFile) throw new Error('No se encontró un archivo .kml dentro del .kmz.');
                                const kmlContent = await kmlFile.async('string');
                                features = kmlFormat.readFeatures(kmlContent, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
                                // End of KMZ fallback logic, skip the rest of the switch case
                                if (features && features.length > 0) {
                                    onAddLayer(createVectorLayer(features, nameForLayer));
                                    toast({ description: `Capa "${nameForLayer}" cargada con ${features.length} entidades.` });
                                } else {
                                    toast({ description: `No se encontraron entidades en "${nameForLayer}".` });
                                }
                                return; // Exit after successful KMZ processing
                            } catch (kmzError) {
                                throw new Error(`No se pudo procesar el archivo ${fileExtension} como Shapefile ni como KMZ.`);
                            }
                        }
                        // If not a KMZ or if KMZ fallback fails, rethrow the original shpError
                        throw shpError;
                    }
                    
                    if (Array.isArray(geojsonData)) {
                       features = geojsonData.flatMap(data => geojsonFormat.readFeatures(data));
                    } else {
                       features = geojsonFormat.readFeatures(geojsonData);
                    }
                    break;
                }
                default:
                    throw new Error(`Tipo de archivo no soportado: .${fileExtension}`);
            }

            if (features && features.length > 0) {
                onAddLayer(createVectorLayer(features, nameForLayer));
                toast({ description: `Capa "${nameForLayer}" cargada con ${features.length} entidades.` });
            } else {
               toast({ description: `No se encontraron entidades en "${nameForLayer}".` });
            }
        } catch (err: any) {
            throw err;
        }
    };
    
    // --- Main Logic ---
    let files = selectedFile ? [selectedFile] : Array.from(selectedMultipleFiles || []);
    if (files.length === 0) return;

    // --- Shapefile bundling logic ---
    const shapefileGroups: { [basename: string]: File[] } = {};
    const otherFiles: File[] = [];
    const shpBasenames = new Set<string>();

    // First, identify all potential shapefile groups by finding .shp files
    for (const file of files) {
        if (getFileExtension(file.name) === 'shp') {
            shpBasenames.add(getBaseName(file.name));
        }
    }

    // Now, segregate all files into their respective shapefile groups or as "other" files
    for (const file of files) {
        const basename = getBaseName(file.name);
        const fileExtension = getFileExtension(file.name);
        const isShapefileComponent = ['shp', 'shx', 'dbf', 'prj', 'cpg', 'sbn', 'sbx'].includes(fileExtension);
        
        if (shpBasenames.has(basename) && isShapefileComponent) {
            if (!shapefileGroups[basename]) {
                shapefileGroups[basename] = [];
            }
            shapefileGroups[basename].push(file);
        } else {
            otherFiles.push(file);
        }
    }

    // Process each identified shapefile group
    for (const basename in shapefileGroups) {
        const groupFiles = shapefileGroups[basename];
        const fileNames = groupFiles.map(f => f.name);

        // Check for required files (.shp is guaranteed, check .dbf, .shx)
        if (!fileNames.includes(`${basename}.dbf`) || !fileNames.includes(`${basename}.shx`)) {
            toast({ description: `Faltan archivos para el Shapefile "${basename}". Se requieren .shp, .dbf y .shx.`, variant: 'destructive' });
            continue; // Skip this group
        }

        const zip = new JSZip();
        groupFiles.forEach(file => {
            zip.file(file.name, file.slice());
        });

        try {
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipFile = new File([zipBlob], `${basename}.zip`);
            const arrayBuffer = await zipFile.arrayBuffer();
            await processAndAddLayer(arrayBuffer, zipFile, basename);
        } catch(err: any) {
            console.error(`Error processing shapefile group ${basename}:`, err);
            toast({ description: `Error al procesar el Shapefile "${basename}": ${err.message}`, variant: 'destructive' });
        }
    }

    // --- Process remaining files ---
    for (const file of otherFiles) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                if (!e.target?.result) throw new Error("File content is empty.");
                await processAndAddLayer(e.target.result, file);
            } catch (err: any) {
                console.error(`Error processing file ${file.name}:`, err);
                toast({ description: `Error al procesar ${file.name}: ${err.message}`, variant: 'destructive' });
            }
        };
        reader.onerror = () => {
             toast({ description: `No se pudo leer el archivo ${file.name}.`, variant: 'destructive' });
        };
        
        const ext = getFileExtension(file.name);
        if (['zip', 'kmz'].includes(ext)) {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    }
};
