using System;
using System.Collections.Generic;
using UnityEngine;

namespace TrapWars.Dialogue
{
    [CreateAssetMenu(menuName = "Trap Wars/Dialogue Sequence", fileName = "DialogueSequence")]
    public sealed class DialogueSequence : ScriptableObject
    {
        [SerializeField] private string dialogueId = string.Empty;
        [SerializeField] private List<DialogueLine> lines = new();
        public string DialogueId => dialogueId;
        public IReadOnlyList<DialogueLine> Lines => lines;

        public void Configure(string id, params DialogueLine[] content)
        {
            dialogueId = id;
            lines = new List<DialogueLine>(content);
        }
    }

    [Serializable]
    public sealed class DialogueLine
    {
        [SerializeField] private string speaker = string.Empty;
        [SerializeField, TextArea(2, 5)] private string text = string.Empty;
        [SerializeField] private List<string> choices = new();
        public string Speaker => speaker;
        public string Text => text;
        public IReadOnlyList<string> Choices => choices;

        public DialogueLine(string speakerName, string line, params string[] options)
        {
            speaker = speakerName;
            text = line;
            choices = new List<string>(options);
        }
    }
}
