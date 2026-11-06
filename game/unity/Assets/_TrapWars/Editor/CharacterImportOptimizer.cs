using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace TrapWars.EditorTools
{
    /// <summary>
    /// The hero source model ships with a full facial rig (hundreds of blend shapes per mesh). The runtime only
    /// drives blink shapes, and the unused shapes made up roughly 150 MB of the WebGL build. This postprocessor
    /// keeps the shapes the game uses and strips everything else at import time, so the source file stays untouched.
    /// </summary>
    public sealed class CharacterImportOptimizer : AssetPostprocessor
    {
        private const string HeroModelPath = "Assets/_TrapWars/Resources/M8/Characters/M85/M85_Hero_RealisticMan.fbx";
        private static readonly string[] RetainedBlendShapeTokens = { "blink" };

        public override uint GetVersion() => 1;

        private void OnPostprocessModel(GameObject root)
        {
            if (!string.Equals(assetPath, HeroModelPath, StringComparison.OrdinalIgnoreCase)) return;

            var removed = 0;
            var retained = 0;
            foreach (var renderer in root.GetComponentsInChildren<SkinnedMeshRenderer>(true))
            {
                var mesh = renderer.sharedMesh;
                if (mesh == null || mesh.blendShapeCount == 0) continue;
                var before = mesh.blendShapeCount;
                RetainBlendShapes(mesh);
                retained += mesh.blendShapeCount;
                removed += before - mesh.blendShapeCount;
            }

            Debug.Log($"[CHARACTER_IMPORT] {assetPath}: retained {retained} blend shapes, removed {removed}.");
        }

        private static void RetainBlendShapes(Mesh mesh)
        {
            var vertexCount = mesh.vertexCount;
            var frames = new List<(string Name, float Weight, Vector3[] Vertices, Vector3[] Normals, Vector3[] Tangents)>();
            for (var shape = 0; shape < mesh.blendShapeCount; shape++)
            {
                var name = mesh.GetBlendShapeName(shape);
                if (!IsRetained(name)) continue;
                for (var frame = 0; frame < mesh.GetBlendShapeFrameCount(shape); frame++)
                {
                    var vertices = new Vector3[vertexCount];
                    var normals = new Vector3[vertexCount];
                    var tangents = new Vector3[vertexCount];
                    mesh.GetBlendShapeFrameVertices(shape, frame, vertices, normals, tangents);
                    frames.Add((name, mesh.GetBlendShapeFrameWeight(shape, frame), vertices, normals, tangents));
                }
            }

            mesh.ClearBlendShapes();
            foreach (var frame in frames)
                mesh.AddBlendShapeFrame(frame.Name, frame.Weight, frame.Vertices, frame.Normals, frame.Tangents);
        }

        private static bool IsRetained(string blendShapeName)
        {
            foreach (var token in RetainedBlendShapeTokens)
                if (blendShapeName.IndexOf(token, StringComparison.OrdinalIgnoreCase) >= 0) return true;
            return false;
        }
    }
}
