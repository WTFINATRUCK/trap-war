"""Converts the Trap Wars source FBX assets into web-ready GLB files for the browser demo.

Run from the repository root with Blender's Python module installed (`pip install bpy`):
    python3 scripts/build_demo_assets.py
"""
import bpy, os, mathutils

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
R = os.path.join(ROOT, "game/unity/Assets/_TrapWars/Resources/M8/")
OUT = os.path.join(ROOT, "public/demo/assets/models/")
TEX = R + "Environment/Textures/"

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def world_bounds(objs):
    mn = mathutils.Vector((1e9,) * 3); mx = mathutils.Vector((-1e9,) * 3)
    for o in objs:
        if o.type != 'MESH': continue
        for c in o.bound_box:
            w = o.matrix_world @ mathutils.Vector(c)
            mn = mathutils.Vector(map(min, mn, w)); mx = mathutils.Vector(map(max, mx, w))
    return mn, mx

CHAR_COLORS = {
    "hero": {"Shirt": (0.05, 0.05, 0.058), "Pants": (0.035, 0.05, 0.1), "Hair": (0.01, 0.008, 0.008), "Belt": (0.6, 0.45, 0.12), "Skin": (0.3, 0.16, 0.09)},
    "ray": {"Shirt": (0.32, 0.03, 0.04), "Pants": (0.12, 0.1, 0.07), "Hair": (0.015, 0.01, 0.01), "Belt": (0.05, 0.05, 0.05), "Skin": (0.2, 0.11, 0.065)},
    "crowd_a": {"Skin": (0.55, 0.36, 0.24)},
    "crowd_b": {"Skin": (0.36, 0.21, 0.12)},
    "crowd_c": {"Skin": (0.68, 0.48, 0.37)},
}
KEEP_ACTIONS = {"Idle", "Walk", "PickUp", "Victory", "Defeat", "Punch"}

def build_character(src, name, height=1.8):
    reset()
    bpy.ops.import_scene.fbx(filepath=R + src)
    objs = list(bpy.data.objects)
    arm = next(o for o in objs if o.type == 'ARMATURE')
    mn, mx = world_bounds(objs)
    current = mx.z - mn.z
    factor = height / current
    arm.scale = arm.scale * factor
    bpy.context.view_layer.update()
    for m in bpy.data.materials:
        colors = CHAR_COLORS.get(name, {})
        if m.name in colors and m.use_nodes:
            bsdf = m.node_tree.nodes.get("Principled BSDF")
            if bsdf: bsdf.inputs["Base Color"].default_value = (*colors[m.name], 1)
        if m.use_nodes:
            bsdf = m.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                # The source FBX materials carry alpha 0, which exports as invisible/ghosted in glTF.
                bsdf.inputs["Alpha"].default_value = 1.0
                m.surface_render_method = 'DITHERED'
                if hasattr(m, "blend_method"): m.blend_method = 'OPAQUE'
                bsdf.inputs["Roughness"].default_value = 0.78 if m.name != "Belt" else 0.4
                if "Metallic" in bsdf.inputs: bsdf.inputs["Metallic"].default_value = 0.0
    for a in list(bpy.data.actions):
        short = a.name.split("|")[-1]
        if short in KEEP_ACTIONS:
            a.name = short
            a.use_fake_user = True
        else:
            bpy.data.actions.remove(a)
    bpy.ops.export_scene.gltf(filepath=OUT + name + ".glb", export_format='GLB', export_animations=True,
                              export_animation_mode='ACTIONS', export_apply=False, export_yup=True,
                              export_morph=False, export_skins=True, export_cameras=False, export_lights=False)
    print("CHAR", name, "factor", round(factor, 4), "size", os.path.getsize(OUT + name + ".glb"))

PROPS = ["detail_dumpster_closed", "detail_bench", "detail_barrier_strong_damaged", "pallet", "pallet_small", "planks",
         "detail_light_single", "detail_light_double", "detail_awning_small", "detail_awning_wide", "detail_cables_type_a",
         "detail_cables_type_b", "scaffolding_structure", "tree_shrub", "truck_flat", "truck_grey", "door_type_a",
         "door_type_b", "detail_bricks_type_a", "detail_bricks_type_b"]

def build_props():
    reset()
    images = {}
    for prop in PROPS:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.fbx(filepath=R + f"Environment/SM_URB_{prop}.fbx")
        new = [o for o in bpy.data.objects if o not in before]
        roots = [o for o in new if o.parent is None]
        empty = bpy.data.objects.new(prop, None)
        bpy.context.scene.collection.objects.link(empty)
        for r in roots: r.parent = empty
    for m in bpy.data.materials:
        key = m.name.split(".")[0].lower()
        path = TEX + f"TX_URB_{key}.png"
        if not os.path.exists(path) or not m.use_nodes: continue
        img = images.get(key) or bpy.data.images.load(path)
        images[key] = img
        nt = m.node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img; tex.interpolation = 'Closest'
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.85
        bsdf.inputs["Alpha"].default_value = 1.0
    bpy.ops.export_scene.gltf(filepath=OUT + "props.glb", export_format='GLB', export_yup=True, export_apply=True)
    print("PROPS size", os.path.getsize(OUT + "props.glb"))

os.makedirs(OUT, exist_ok=True)
build_character("Characters/SK_Hero_Casual2.fbx", "hero")
build_character("Characters/SK_Ray_Casual3.fbx", "ray")
for c in "ABC":
    build_character(f"Characters/SK_Crowd_Female_{c}.fbx", f"crowd_{c.lower()}", 1.72)
build_props()
