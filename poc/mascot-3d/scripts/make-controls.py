# Writes the two CSP control models: one triangle with a 1x1 PNG, embedded in a GLB or external.
import base64, json, struct

PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==')
pos = struct.pack('<9f', 0, 0, 0, 1, 0, 0, 0, 1, 0)
uv = struct.pack('<6f', 0, 0, 1, 0, 0, 1)
geo = pos + uv


def doc(image, buffers, views):
    return {
        'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0}],
        'meshes': [{'primitives': [{'attributes': {'POSITION': 0, 'TEXCOORD_0': 1}, 'material': 0}]}],
        'materials': [{'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}}}],
        'textures': [{'source': 0}], 'images': [image], 'buffers': buffers, 'bufferViews': views,
        'accessors': [
            {'bufferView': 0, 'componentType': 5126, 'count': 3, 'type': 'VEC3', 'min': [0, 0, 0], 'max': [1, 1, 0]},
            {'bufferView': 1, 'componentType': 5126, 'count': 3, 'type': 'VEC2'},
        ],
    }


base = [{'buffer': 0, 'byteOffset': 0, 'byteLength': 36}, {'buffer': 0, 'byteOffset': 36, 'byteLength': 24}]
open('public/models/control-pixel.png', 'wb').write(PNG)
open('public/models/control-geometry.bin', 'wb').write(geo)
open('public/models/control-external.gltf', 'w').write(json.dumps(doc(
    {'uri': 'control-pixel.png'},
    [{'uri': 'control-geometry.bin', 'byteLength': len(geo)}],
    base)))
pad = PNG + b'\0' * (-len(PNG) % 4)
blob = geo + pad
j = json.dumps(doc(
    {'bufferView': 2, 'mimeType': 'image/png'},
    [{'byteLength': len(blob)}],
    base + [{'buffer': 0, 'byteOffset': 60, 'byteLength': len(PNG)}])).encode()
j += b' ' * (-len(j) % 4)
with open('public/models/control-embedded.glb', 'wb') as f:
    f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(j) + 8 + len(blob)))
    f.write(struct.pack('<I4s', len(j), b'JSON') + j)
    f.write(struct.pack('<I4s', len(blob), b'BIN\0') + blob)
