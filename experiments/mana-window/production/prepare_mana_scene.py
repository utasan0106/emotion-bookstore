"""Prepare a separate Blender scene for modelling and look development.

This creates reference, guide bones, cameras and lights only. It does not create
a finished mesh, production rig, animation, or verified render. Blender runtime
is not installed in the authoring workspace; only Python syntax is verified.
Use a fresh Blender process. Existing output files are never overwritten.
"""
import argparse
import json
import sys
from pathlib import Path


def validate_spec(spec):
    names = set()
    for bone in spec['guideBones']:
        if bone['head'] == bone['tail'] or bone['name'] in names:
            raise ValueError('Invalid or duplicate guide bone')
        if bone.get('parent') and bone['parent'] not in names:
            raise ValueError('Parent must precede child')
        names.add(bone['name'])
    for camera in spec['cameras']:
        if camera['position'] == camera['target'] or camera['orthoScale'] <= 0:
            raise ValueError('Invalid camera')
    for preset in spec['lightingPresets'].values():
        for light in preset['lights']:
            if light['position'] == light['target'] or light['power'] < 0 or light['size'] <= 0:
                raise ValueError('Invalid light')


def main():
    base = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser()
    parser.add_argument('--spec', type=Path, default=base / 'scene-spec.json')
    parser.add_argument('--reference', type=Path, default=base.parent / 'assets/mana-reference.png')
    parser.add_argument('--lighting', choices=['studio', 'evening'], default='studio')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--validate-only', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
    spec = json.loads(args.spec.read_text(encoding='utf-8'))
    validate_spec(spec)
    if args.validate_only:
        print('Specification valid. No Blender scene or character has been produced.')
        return
    if not args.output or args.output.suffix.lower() != '.blend':
        parser.error('--output must name a new .blend file')
    output = args.output.resolve()
    if output.exists():
        raise FileExistsError('Refusing to overwrite existing output: ' + str(output))
    if not args.reference.is_file():
        raise FileNotFoundError(args.reference)
    import bpy
    from mathutils import Vector

    # Own scene; no deletion of objects, meshes, materials or other user scenes.
    scene = bpy.data.scenes.new('Mana_Preproduction_' + args.lighting)
    if bpy.context.window is None:
        raise RuntimeError('No Blender window context; run in a fresh standard Blender process')
    bpy.context.window.scene = scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    scene.render.fps = spec['fps']
    scene.frame_start, scene.frame_end = spec['frames']
    scene.render.resolution_x, scene.render.resolution_y = spec['renderSize']
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.film_transparent = True
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    try:
        scene.view_settings.view_transform = 'AgX'
    except TypeError:
        print('AgX unavailable. Confirm color management in this Blender version.')
    scene['status'] = spec['status']
    scene['instructions'] = 'Guide rig only. Add and fit the character mesh before skinning. No finished animation.'

    def collection(name):
        coll = bpy.data.collections.new(name)
        scene.collection.children.link(coll)
        return coll

    refs = collection('00_Reference_NOT_RENDERED')
    guides = collection('01_Guide_Armature_NOT_BOUND')
    collection('02_Character_Mesh_ADD_HERE')
    cameras = collection('03_Review_Cameras')
    lights = collection('04_Look_Development')
    refs.hide_render = True

    def point_at(obj, target):
        direction = Vector(target) - obj.location
        obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

    for entry in spec['cameras']:
        data = bpy.data.cameras.new('Mana_' + entry['name'])
        obj = bpy.data.objects.new(data.name, data)
        cameras.objects.link(obj)
        obj.location = entry['position']
        data.type = 'ORTHO'
        data.ortho_scale = entry['orthoScale']
        point_at(obj, entry['target'])
        if entry['name'] == 'front':
            scene.camera = obj

    preset = spec['lightingPresets'][args.lighting]
    world = bpy.data.worlds.new('Mana_' + args.lighting)
    world.use_nodes = True
    world.node_tree.nodes.get('Background').inputs['Strength'].default_value = preset['worldStrength']
    scene.world = world
    for entry in preset['lights']:
        data = bpy.data.lights.new('Mana_' + entry['name'], 'AREA')
        obj = bpy.data.objects.new(data.name, data)
        lights.objects.link(obj)
        obj.location = entry['position']
        data.energy, data.size, data.color = entry['power'], entry['size'], entry['color']
        point_at(obj, entry['target'])

    image = bpy.data.images.load(str(args.reference.resolve()), check_existing=False)
    image.pack()
    ref = bpy.data.objects.new('Mana_design_reference_not_measured_turnaround', None)
    refs.objects.link(ref)
    ref.empty_display_type = 'IMAGE'
    ref.data = image
    ref.empty_display_size = 2.4
    ref.location = (-2, 0, 0.8)
    ref.rotation_euler[0] = 1.57079632679
    ref.hide_render = True

    data = bpy.data.armatures.new('Mana_GUIDE_ONLY')
    rig = bpy.data.objects.new('Mana_GUIDE_ONLY', data)
    guides.objects.link(rig)
    rig.show_in_front = True
    rig['status'] = 'Position guides only; fit to mesh before adding deform weights and controls'
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    expanded = []
    for bone in spec['guideBones']:
        expanded.append(bone)
        if bone.get('mirror'):
            mirrored = dict(bone)
            mirrored['name'] = bone['name'].replace('.L', '.R')
            mirrored['parent'] = bone.get('parent', '').replace('.L', '.R')
            mirrored['head'] = [-bone['head'][0], *bone['head'][1:]]
            mirrored['tail'] = [-bone['tail'][0], *bone['tail'][1:]]
            expanded.append(mirrored)
    for entry in expanded:
        bone = data.edit_bones.new(entry['name'])
        bone.head, bone.tail = entry['head'], entry['tail']
        bone.use_deform = False
        if entry.get('parent'):
            bone.parent = data.edit_bones[entry['parent']]
    bpy.ops.object.mode_set(mode='OBJECT')
    scene.frame_set(1)
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(output), check_existing=True)
    print('Saved preparation scene. No character mesh, bound rig, animation or final render:', output)


if __name__ == '__main__':
    main()
