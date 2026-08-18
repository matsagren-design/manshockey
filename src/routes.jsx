import React, { lazy } from "react";

const Dashboard = lazy(() =>
  import("./pages/Dashboard.jsx").then(module => ({
    default: module.Dashboard
  }))
);

const MatchCenter = lazy(() =>
  import("./pages/MatchCenter.jsx").then(module => ({
    default: module.MatchCenter
  }))
);

const GameCenter = lazy(() =>
  import("./pages/GameCenter.jsx").then(module => ({
    default: module.GameCenter
  }))
);

const ScoutCenter = lazy(() =>
  import("./pages/ScoutCenter.jsx").then(module => ({
    default: module.ScoutCenter
  }))
);

const PlayerPage = lazy(() =>
  import("./pages/PlayerPage.jsx").then(module => ({
    default: module.PlayerPage
  }))
);

const DataPage = lazy(() =>
  import("./pages/DataPage.jsx").then(module => ({
    default: module.DataPage
  }))
);

const Analytics = lazy(() =>
  import("./pages/Analytics.jsx").then(module => ({
    default: module.Analytics
  }))
);

const AICoach = lazy(() =>
  import("./pages/AICoach.jsx").then(module => ({
    default: module.AICoach
  }))
);

const VideoCoach = lazy(() =>
  import("./pages/VideoCoach.jsx").then(module => ({
    default: module.VideoCoach
  }))
);

const Admin = lazy(() =>
  import("./pages/Admin.jsx").then(module => ({
    default: module.Admin
  }))
);

const MediaWatch = lazy(() =>
  import("./pages/MediaWatch.jsx").then(module => ({
    default: module.MediaWatch
  }))
);

function DashboardRoute(props) {
  return (
    <Dashboard
      matches={props.matches}
      scout={props.scout}
      media={props.media}
      travel={props.travel}
      familyTasks={props.familyTasks}
      gameEvents={props.gameEvents}
      health={props.health}
      setActive={props.setActive}
      setSelectedMatchId={props.setSelectedMatchId}
    />
  );
}

function MatchCenterRoute(props) {
  return (
    <MatchCenter
      selectedMatchId={props.selectedMatchId}
      setSelectedMatchId={props.setSelectedMatchId}
    />
  );
}

function GameCenterRoute(props) {
  return (
    <GameCenter
      matches={props.matches}
      gameEvents={props.gameEvents}
      playerStats={props.playerStats}
      selectedMatchId={props.selectedMatchId}
      setSelectedMatchId={props.setSelectedMatchId}
      user={props.user}
      reload={props.reload}
    />
  );
}

function ScoutCenterRoute(props) {
  return <ScoutCenter scout={props.scout} />;
}

function OpponentScoutRoute(props) {
  return <OpponentScout matches={props.matches} />;
}

function PlayerRoute(props) {
  return (
    <PlayerPage
      profile={props.profile}
      playerStats={props.playerStats}
      media={props.media}
      scout={props.scout}
    />
  );
}

function MatchesRoute(props) {
  return (
    <DataPage
      type="matches"
      kicker="Match CMS"
      title="Matcher"
      items={props.matches}
      setItems={props.setMatches}
      user={props.user}
      reload={props.reload}
      setActive={props.setActive}
      setSelectedMatchId={props.setSelectedMatchId}
    />
  );
}

function MediaRoute(props) {
  return (
    <DataPage
      type="media"
      kicker="Media Center"
      title="Media"
      items={props.media}
      setItems={props.setMedia}
      user={props.user}
      reload={props.reload}
    />
  );
}

function TravelRoute(props) {
  return (
    <DataPage
      type="travel"
      kicker="Travel Center"
      title="Resor"
      items={props.travel}
      setItems={props.setTravel}
      user={props.user}
      reload={props.reload}
    />
  );
}

function FamilyRoute(props) {
  return (
    <DataPage
      type="family_tasks"
      kicker="Family Portal"
      title="Familjeportal"
      items={props.familyTasks}
      setItems={props.setFamilyTasks}
      user={props.user}
      reload={props.reload}
    />
  );
}

function DocumentsRoute(props) {
  return (
    <DataPage
      type="documents"
      kicker="Document Center"
      title="Dokument"
      items={props.documents}
      setItems={props.setDocuments}
      user={props.user}
      reload={props.reload}
    />
  );
}

function AnalyticsRoute(props) {
  return (
    <Analytics
      analytics={props.analytics}
      playerStats={props.playerStats}
    />
  );
}

function VideoRoute(props) {
  return <VideoCoach matches={props.matches} user={props.user} />;
}

function AdminRoute(props) {
  return (
    <Admin
      user={props.user}
      onLogin={props.onLogin}
      health={props.health}
    />
  );
}

export const routes = {
  dashboard: {
    label: "Dashboard",
    component: DashboardRoute
  },
  matchcenter: {
    label: "Matchcenter",
    component: MatchCenterRoute
  },
  gamecenter: {
    label: "GameCenter",
    component: GameCenterRoute
  },
  scoutcenter: {
    label: "Scout Center",
    component: ScoutCenterRoute
  },
  player: {
    label: "Måns",
    component: PlayerRoute
  },
  matches: {
    label: "Matcher",
    component: MatchesRoute
  },
  media: {
    label: "Media",
    component: MediaRoute
  },
  travel: {
    label: "Resor",
    component: TravelRoute
  },
  family: {
    label: "Familj",
    component: FamilyRoute
  },
  documents: {
    label: "Dokument",
    component: DocumentsRoute
  },
  analytics: {
    label: "Analytics",
    component: AnalyticsRoute
  },
  ai: {
    label: "AI Coach",
    component: AICoach
  },
  video: {
    label: "Video Coach",
    component: VideoRoute
  },
  admin: {
    label: "Admin",
    component: AdminRoute
  },
  mediawatch: {
    label: "Media Watch",
    component: MediaWatch
},
};
