using System;
using System.Diagnostics;
using System.Collections.Generic;
using TrapWars.Services;

namespace TrapWars.Objectives
{
    public enum GreyboxObjective
    {
        CheckWordOnTheStreet,
        LeaveSafehouse,
        InvestigateBlock,
        MeetContact,
        ReviewOpportunity,
        MakeYourMove,
        SeeMarketOutcome,
        EndTheDay,
        DayTwoHook,
        Complete
    }

    public sealed class ObjectiveDirector
    {
        private readonly IAnalyticsService analytics;
        private long stepStartedAt = Stopwatch.GetTimestamp();
        public GreyboxObjective Current { get; private set; } = GreyboxObjective.CheckWordOnTheStreet;
        public event Action<GreyboxObjective>? Changed;

        public ObjectiveDirector(IAnalyticsService analytics)
        {
            this.analytics = analytics;
        }

        public void ResumeFromAuthoritativeDay(int day)
        {
            if (day <= 1 || Current != GreyboxObjective.CheckWordOnTheStreet) return;
            Current = GreyboxObjective.DayTwoHook;
            Changed?.Invoke(Current);
        }

        public string CurrentText => Current switch
        {
            GreyboxObjective.CheckWordOnTheStreet => "Check Word on the Street",
            GreyboxObjective.LeaveSafehouse => "Hit the block",
            GreyboxObjective.InvestigateBlock => "Read the block",
            GreyboxObjective.MeetContact => "Meet your contact",
            GreyboxObjective.ReviewOpportunity => "Review the opportunity",
            GreyboxObjective.MakeYourMove => "Make your move",
            GreyboxObjective.SeeMarketOutcome => "See how the market played out",
            GreyboxObjective.EndTheDay => "End the day",
            GreyboxObjective.DayTwoHook => "Check the new notification",
            GreyboxObjective.Complete => "Day 2 is waiting",
            _ => string.Empty
        };

        public void AdvanceFrom(GreyboxObjective expected)
        {
            if (Current != expected || Current == GreyboxObjective.Complete) return;
            var completed = Current;
            var durationMs = (Stopwatch.GetTimestamp() - stepStartedAt) * 1000L / Stopwatch.Frequency;
            Current += 1;
            analytics.Track("objective.step_completed", new Dictionary<string, object> { ["objective_id"] = completed.ToString(), ["duration_ms"] = durationMs });
            analytics.Track("objective.advanced", new Dictionary<string, object> { ["objective_id"] = Current.ToString() });
            stepStartedAt = Stopwatch.GetTimestamp();
            Changed?.Invoke(Current);
        }
    }
}
