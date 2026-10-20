import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";

import { Glyph } from "@/components/Glyph";
import { PROGRAM_ART } from "@/components/glyphs";
import {
  HeaderAction,
  HeaderActions,
  TabHeader,
  TabHeaderText,
} from "@/components/TabHeader";
import {
  Button,
  Card,
  CountUp,
  Dialog,
  Divider,
  enter,
  Header,
  IconButton,
  IconTile,
  ListRow,
  OptionCard,
  Pill,
  PressableScale,
  ProgressBar,
  Screen,
  SectionTitle,
  Sheet,
  T,
  tap,
  useToast,
  type IconName,
} from "@/components/ui";
import { NOTIFICATIONS } from "@/data/notifications";
import { PLAN_TIERS } from "@/data/plans";
import { PROGRAM_DAYS, programById } from "@/data/program";
import { bmiLabel, cmToFtIn } from "@/lib/calc";
import { isPremiumActive, useStore, workoutStreak } from "@/lib/store";
import { useAccess } from "@/lib/useAccess";
import { trainerById, firstName as trainerFirstName } from "@/data/trainers";
import { C, R, shadowSm } from "@/theme";
import { BackupCard } from "./backup";
import {
  AboutSheet,
  Avatar,
  Decor,
  DIETS,
  fmtFull,
  fmtNum,
  fmtPhone,
  fmtWeight,
  GOAL_ICON,
  goalMeta,
  goalSummary,
  GOLD,
  GroupLabel,
  HelpSheet,
  PlanBadge,
  planEnd,
  PREMIUM_BG,
  realRestrictions,
  shared,
  tint,
} from "./shared";
import { RateSheet, WorkoutSettingsSheet } from "./sheets";

const LOGO = require("@/assets/images/logo-mark.png");
/** Presenter-only controls (restart onboarding, reset data, log out). Flip to true to show them again. */
const SHOW_PRESENTER_CONTROLS = false;

type SheetKind =
  | null
  | "diet"
  | "help"
  | "about"
  | "workout"
  | "rate";
type DialogKind = null | "restart" | "reset" | "logout";

const DIALOGS = {
  restart: {
    icon: "🔁",
    title: "Restart onboarding?",
    text: "Walk through the onboarding flow again from the start. Great for showing the full journey.",
    confirm: "Restart",
    danger: false,
  },
  reset: {
    icon: "🧹",
    title: "Reset all demo data?",
    text: "This clears your profile, logs and subscription on this device and starts completely fresh.",
    confirm: "Reset All",
    danger: true,
  },
  logout: {
    icon: "👋",
    title: "Log out of Fittelo?",
    text: "You can log back in anytime with your email, Google or Apple account. Your data stays on this device.",
    confirm: "Log out",
    danger: true,
  },
};

/** Onboarding diet card that matches a diet preference, so both fields stay in sync. */
const dietTypeFor = (diet: string, prev: string) =>
  diet === "Vegetarian" || diet === "Vegan"
    ? diet
    : diet === "Non-vegetarian"
      ? prev === "Meat-based"
        ? prev
        : "Regular diet"
      : "Other";

/** Settings row with a tinted icon tile. */
function Row({
  icon,
  color,
  bg,
  title,
  subtitle,
  onPress,
  right,
}: {
  icon: IconName;
  color: string;
  bg?: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  right?: ReactNode;
}) {
  return (
    <ListRow
      icon={icon}
      iconColor={color}
      iconBg={bg ?? tint(color)}
      title={title}
      subtitle={subtitle}
      onPress={onPress}
      right={right}
    />
  );
}

/** The profile / "Me" content. `tab` = Me tab (large title), `stack` = pushed /profile screen (back arrow). */
export function ProfileBody({ mode }: { mode: "tab" | "stack" }) {
  const {
    state,
    targets: t,
    updateProfile,
    restartOnboarding,
    resetAll,
  } = useStore();
  const toast = useToast();
  const p = state.profile;
  const units = state.settings.units;
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });

  const close = () => setSheet(null);
  const unread = NOTIFICATIONS.filter(
    (n) => !state.readNotifs.includes(n.id),
  ).length;
  const b = bmiLabel(t.bmi);
  const goal = goalSummary(p, t, units);
  const restrictions = realRestrictions(p.restrictions);
  const premium = isPremiumActive(state.premium) ? state.premium : null;
  const access = useAccess();
  const coach = trainerById(state.trainerId);
  const tier = premium ? PLAN_TIERS.find((x) => x.id === premium.tier) : null;
  const planTill = premium
    ? fmtFull(planEnd(premium.since, premium.months))
    : "";
  const program = programById(p.program);
  const done = Math.min(PROGRAM_DAYS, state.programProgress[program.id] ?? 0);
  const nextDay = Math.min(PROGRAM_DAYS, done + 1);
  const streak = workoutStreak(state);

  const confirmDialog = () => {
    const kind = dialog;
    setDialog(null);
    setTimeout(() => {
      if (kind === "reset") resetAll();
      else restartOnboarding();
      router.replace("/onboarding");
    }, 220);
  };

  return (
    <Screen>
      {mode === "stack" ? (
        <Header
          title="Profile"
          right={
            <IconButton
              icon="settings-outline"
              bordered
              onPress={() => router.push("/settings")}
            />
          }
        />
      ) : (
        <TabHeader
          scrollY={scrollY}
          eyebrow="Profile · Plan · Settings"
          title="Me"
          collapse={[150, 200]}
          compact={
            <>
              <Avatar name={p.name} premium={!!premium} size={38} />
              <TabHeaderText
                title={p.name || "Fittelo member"}
                sub={premium ? `Premium · valid till ${planTill}` : "Free plan"}
              />
            </>
          }
          right={
            <HeaderActions>
              <HeaderAction icon="settings-outline" label="Settings" href="/settings" />
              <HeaderAction
                icon="notifications-outline"
                label={unread ? `Notifications, ${unread} unread` : "Notifications"}
                href="/notifications"
                badge={unread}
              />
            </HeaderActions>
          }
        />
      )}
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          st.content,
          mode === "tab" && { paddingBottom: 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <Animated.View entering={enter(0)}>
          <View style={st.hero}>
            <LinearGradient
              colors={PREMIUM_BG}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={st.heroBg}
            >
              <Decor />
              <View style={st.heroTop}>
                <Avatar name={p.name} premium={!!premium} size={64} ring />
                <View style={{ flex: 1 }}>
                  <Text style={st.hello}>Hello,</Text>
                  <Text style={st.name} numberOfLines={1}>
                    {p.name || "Fittelo member"}
                  </Text>
                  {!!p.phone && (
                    <Text style={st.phone}>{fmtPhone(p.phone)}</Text>
                  )}
                </View>
                <PressableScale
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                  onPress={() => {
                    tap();
                    router.push("/edit-profile");
                  }}
                  style={st.editBtn}
                >
                  <Ionicons name="create-outline" size={18} color={C.white} />
                </PressableScale>
              </View>
              <View style={st.badges}>
                <PlanBadge tier={premium?.tier} />
                <Pill
                  icon={GOAL_ICON[p.goal]}
                  text={goalMeta(p.goal).title.toUpperCase()}
                  color={C.white}
                  bg="rgba(255,255,255,0.16)"
                />
                {!!streak && (
                  <Pill
                    icon="flame"
                    text={`${streak}-DAY STREAK`}
                    color={C.white}
                    bg="rgba(242,112,58,0.85)"
                  />
                )}
              </View>
            </LinearGradient>
            <View style={st.stats}>
              <Stat
                icon="body-outline"
                color={C.water}
                bg={C.waterSoft}
                label="Height"
                value={`${p.heightCm} cm`}
                sub={cmToFtIn(p.heightCm)}
              />
              <Stat
                icon="scale-outline"
                color={C.weight}
                bg={C.weightSoft}
                label="Weight"
                value={fmtWeight(p.weightKg, units)}
                sub={`Goal ${fmtWeight(p.targetKg, units)}`}
              />
              <Stat
                icon="calendar-outline"
                color={C.steps}
                bg={C.stepsSoft}
                label="Age"
                value={`${p.age}`}
                sub="years"
              />
              <Stat
                icon="pulse-outline"
                color={C.accent}
                bg={C.accentSoft}
                label="BMI"
                value={t.bmi.toFixed(1)}
                sub={b.label}
                subColor={b.color}
              />
            </View>
          </View>
        </Animated.View>

        {/* Quick actions */}
        <Animated.View entering={enter(1)} style={st.quick}>
          {(
            [
              [
                "sparkles",
                "Ask Saathi",
                C.ai,
                C.aiSoft,
                () => router.push("/coach"),
              ],
              [
                "barbell",
                "Workout",
                C.workout,
                C.workoutSoft,
                () => setSheet("workout"),
              ],
              [
                "notifications",
                unread ? `Inbox · ${unread}` : "Inbox",
                C.accent,
                C.accentSoft,
                () => router.push("/notifications"),
              ],
              [
                "diamond",
                "Plans",
                C.warning,
                C.warningSoft,
                () => router.push("/plans"),
              ],
            ] as [IconName, string, string, string, () => void][]
          ).map(([icon, label, color, bg, onPress]) => (
            <PressableScale
              key={icon}
              scaleTo={0.94}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => {
                tap();
                onPress();
              }}
              style={st.quickTile}
            >
              <View style={[st.quickIcon, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <Text style={st.quickText} numberOfLines={1}>
                {label}
              </Text>
            </PressableScale>
          ))}
        </Animated.View>

        {/* Backup & Restore */}
        <Animated.View entering={enter(1)} style={{ marginTop: 12 }}>
          <BackupCard />
        </Animated.View>

        {/* My plan */}
        <Animated.View entering={enter(2)}>
          <SectionTitle
            title="Your plan"
            action="Adjust"
            onAction={() => router.push("/edit-profile?section=goals")}
          />
          <Card>
            <View style={st.goalRow}>
              <IconTile icon={GOAL_ICON[p.goal]} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={T.h3}>{goal.title}</Text>
                <Text style={[T.small, { marginTop: 2 }]}>{goal.sub}</Text>
              </View>
            </View>
            <Divider style={{ marginVertical: 16 }} />
            <Text style={T.label}>Your daily fuel</Text>
            <View style={st.budgetRow}>
              <CountUp
                value={t.budget}
                format={fmtNum}
                style={st.budget}
                fromZero
              />
              <Text style={st.budgetUnit}>kcal / day</Text>
            </View>
            <View style={st.macros}>
              <Macro label="Protein" value={t.protein} color={C.protein} />
              <Macro label="Carbs" value={t.carbs} color={C.carbs} />
              <Macro label="Fat" value={t.fat} color={C.fat} />
              <Macro label="Fibre" value={t.fiber} color={C.fiber} />
            </View>
            <View style={st.goalsLine}>
              <Pill
                icon="walk"
                text={`${fmtNum(t.stepGoal)} steps`}
                color={C.steps}
                bg={C.stepsSoft}
              />
              <Pill
                icon="water"
                text={`${t.water} glasses water`}
                color={C.water}
                bg={C.waterSoft}
              />
              <Pill
                icon="calendar"
                text={`${p.weeklyGoal} workout days / week`}
                color={C.workout}
                bg={C.workoutSoft}
              />
            </View>

            {/* Current 30-day program */}
            <PressableScale
              scaleTo={0.98}
              accessibilityRole="button"
              onPress={() => {
                tap();
                router.push("/fitness");
              }}
              style={st.program}
            >
              <LinearGradient
                colors={program.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.progIcon}
              >
                <Glyph
                  emoji={program.emoji}
                  src={PROGRAM_ART[program.id]}
                  size={30}
                />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={st.progTitle}>{program.title}</Text>
                <View style={st.progMeta}>
                  <Text style={T.small}>
                    {program.level} · {done}/{PROGRAM_DAYS} days
                  </Text>
                  {!!streak && (
                    <View style={st.streak}>
                      <Ionicons name="flame" size={12} color={C.accent} />
                      <Text style={st.streakText}>{streak}-day streak</Text>
                    </View>
                  )}
                </View>
                <ProgressBar
                  value={done / PROGRAM_DAYS}
                  color={program.colors[1]}
                  height={6}
                  style={{ marginTop: 8 }}
                />
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </PressableScale>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Button
                title="Adjust goals"
                icon="options-outline"
                variant="secondary"
                small
                style={{ flex: 1 }}
                onPress={() => router.push("/edit-profile?section=goals")}
              />
              {done < PROGRAM_DAYS && (
                <Button
                  title={`Start Day ${nextDay}`}
                  icon="play"
                  small
                  style={{ flex: 1 }}
                  onPress={() =>
                    router.push({
                      pathname: "/program-day",
                      params: { key: `program:${program.id}:${nextDay}` },
                    })
                  }
                />
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Premium */}
        <Animated.View entering={enter(3)} style={{ marginTop: 16 }}>
          <PressableScale
            scaleTo={0.98}
            accessibilityRole="button"
            onPress={() => {
              tap();
              router.push("/plans");
            }}
          >
            <LinearGradient
              colors={PREMIUM_BG}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={st.premium}
            >
              <Decor />
              <View style={{ flex: 1 }}>
                <View style={st.premEyebrow}>
                  <Ionicons name="diamond" size={12} color={C.gold} />
                  <Text style={st.premEyebrowText}>FITTELO PREMIUM</Text>
                </View>
                {premium && tier ? (
                  <>
                    <Text style={st.premTitle}>
                      {tier.name.replace("Fittelo ", "")} ·{" "}
                      {premium.cancelledAt ? "Cancelled" : "Active"}
                    </Text>
                    <Text style={st.premSub}>
                      {premium.cancelledAt
                        ? `Cancelled · active till ${planTill}`
                        : `Valid till ${planTill}`}
                    </Text>
                    <View style={st.premCta}>
                      <Text style={st.premCtaText}>Manage plan</Text>
                      <Ionicons name="arrow-forward" size={13} color={C.navy} />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={st.premTitle}>Premium</Text>
                    <Text style={st.premSub}>
                      Unlock every workout, meal plan & coach
                    </Text>
                    <View style={st.premCta}>
                      <Text style={st.premCtaText}>Up to 62% off</Text>
                      <Ionicons name="arrow-forward" size={13} color={C.navy} />
                    </View>
                  </>
                )}
              </View>
              <View style={st.medalOuter}>
                <LinearGradient
                  colors={GOLD}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.medal}
                >
                  <Ionicons
                    name={premium ? "diamond" : "sparkles"}
                    size={28}
                    color={C.navy}
                  />
                </LinearGradient>
              </View>
            </LinearGradient>
          </PressableScale>
        </Animated.View>

        {/* Settings */}
        <Animated.View entering={enter(4)}>
          <GroupLabel title="Preferences" />
          <Card style={shared.listCard}>
            <Row
              icon="settings"
              color={C.primaryDark}
              bg={C.primarySoft}
              title="App settings"
              subtitle="Units, reminders, connected apps"
              onPress={() => router.push("/settings")}
            />
            {access.can("trainer") && (
              <>
                <Divider style={shared.inset} />
                <Row
                  icon="person"
                  color={coach.color}
                  bg={tint(coach.color)}
                  title="Your coach"
                  subtitle={`${coach.name} · ${trainerFirstName(coach)}'s plans, chat & calls`}
                  onPress={() => router.push("/trainer")}
                />
              </>
            )}
            <Divider style={shared.inset} />
            <Row
              icon="barbell"
              color={C.workout}
              bg={C.workoutSoft}
              title="Workout preferences"
              subtitle="Rest, countdown, coach voice & music"
              onPress={() => setSheet("workout")}
            />
            <Divider style={shared.inset} />
            <Row
              icon="leaf"
              color={C.weight}
              bg={C.weightSoft}
              title="Diet preference"
              subtitle={p.diet || "Not set — tap to choose"}
              onPress={() => setSheet("diet")}
            />
            {(p.cuisines.length > 0 || restrictions.length > 0) && (
              <View style={st.chips}>
                {p.cuisines.slice(0, 4).map((c) => (
                  <Pill
                    key={c}
                    text={c}
                    color={C.textSoft}
                    bg={C.surfaceAlt}
                    style={st.chipPill}
                  />
                ))}
                {p.cuisines.length > 4 && (
                  <Pill
                    text={`+${p.cuisines.length - 4}`}
                    color={C.textSoft}
                    bg={C.surfaceAlt}
                    style={st.chipPill}
                  />
                )}
                {restrictions.map((r) => (
                  <Pill key={r} text={r} color={C.accent} bg={C.accentSoft} />
                ))}
              </View>
            )}
            <Divider style={shared.inset} />
            <Row
              icon="notifications"
              color={C.accent}
              bg={C.accentSoft}
              title="Notifications"
              subtitle={unread ? `${unread} unread` : "All caught up"}
              right={
                unread ? (
                  <Pill text={`${unread} NEW`} color={C.white} bg={C.accent} />
                ) : undefined
              }
              onPress={() => router.push("/notifications")}
            />
            <Divider style={shared.inset} />
            <Row
              icon="diamond"
              color={C.warning}
              bg={C.warningSoft}
              title="Membership"
              subtitle={
                premium
                  ? premium.cancelledAt
                    ? `Cancelled · active till ${planTill}`
                    : `${tier?.name ?? "Premium"} · active`
                  : "Smart & Pro · up to 62% off"
              }
              onPress={() => router.push("/plans")}
            />
          </Card>
        </Animated.View>

        {/* Support us */}
        <Animated.View entering={enter(5)}>
          <GroupLabel title="Love Fittelo?" />
          <Card style={shared.listCard}>
            <Row
              icon="star"
              color={C.warning}
              bg={C.warningSoft}
              title="Rate the app"
              subtitle={
                state.rating
                  ? `You rated us ${state.rating} star${state.rating === 1 ? "" : "s"}`
                  : undefined
              }
              onPress={() => setSheet("rate")}
            />
            <Divider style={shared.inset} />
            <Row
              icon="share-social"
              color={C.water}
              bg={C.waterSoft}
              title="Invite a friend"
              subtitle="Get fit together"
              onPress={() =>
                toast("Invite link copied to clipboard", "share-social")
              }
            />
            <Divider style={shared.inset} />
            <Row
              icon="help-circle"
              color={C.fiber}
              title="Help & FAQ"
              subtitle="Answers to common questions"
              onPress={() => setSheet("help")}
            />
            <Divider style={shared.inset} />
            <Row
              icon="shield-checkmark"
              color={C.textSoft}
              bg="#EEEDEB"
              title="About & Privacy"
              subtitle="Version 1.0.0"
              onPress={() => setSheet("about")}
            />
          </Card>
        </Animated.View>

        {/* Demo controls (presenter only, de-emphasised) */}
        <Animated.View entering={enter(6)}>
          {SHOW_PRESENTER_CONTROLS && (
          <>
          <GroupLabel
            title="Demo controls"
            right={<Pill text="PRESENTER ONLY" color={C.muted} bg="#EEEDEB" />}
          />
          <View style={st.demoCard}>
            <DemoRow
              icon="refresh"
              title="Restart onboarding"
              subtitle="Replay the sign-up journey"
              onPress={() => setDialog("restart")}
            />
            <Divider style={st.demoInset} />
            <DemoRow
              icon="trash-outline"
              danger
              title="Reset all demo data"
              subtitle="Start fresh on this device"
              onPress={() => setDialog("reset")}
            />
            <Divider style={st.demoInset} />
            <DemoRow
              icon="log-out-outline"
              danger
              title="Log out"
              onPress={() => setDialog("logout")}
            />
          </View>
          </>
          )}
          <View style={st.footer}>
            <View style={st.footerLogo}>
              <Image source={LOGO} style={{ width: 13, height: 13 }} contentFit="contain" />
            </View>
            <Text style={st.footerText}>
              Fittelo v1.0.0
            </Text>
          </View>
        </Animated.View>
      </Animated.ScrollView>

      {/* Diet sheet */}
      <Sheet
        visible={sheet === "diet"}
        onClose={close}
        title="Diet preference"
        scroll
      >
        <Text style={[T.small, { marginBottom: 12 }]}>
          Saathi and your meal suggestions will follow this.
        </Text>
        {DIETS.map((d) => (
          <OptionCard
            key={d.value}
            emoji={d.emoji}
            title={d.value}
            subtitle={d.sub}
            selected={p.diet === d.value}
            onPress={() => {
              updateProfile({
                diet: d.value,
                dietType: dietTypeFor(d.value, p.dietType),
              });
              toast(`Diet set to ${d.value}`, "leaf");
              setTimeout(close, 250);
            }}
          />
        ))}
      </Sheet>

      <WorkoutSettingsSheet visible={sheet === "workout"} onClose={close} />
      <RateSheet visible={sheet === "rate"} onClose={close} />
      <HelpSheet visible={sheet === "help"} onClose={close} />
      <AboutSheet visible={sheet === "about"} onClose={close} />

      {dialog && (
        <Dialog
          visible
          icon={DIALOGS[dialog].icon}
          title={DIALOGS[dialog].title}
          text={DIALOGS[dialog].text}
          confirm={DIALOGS[dialog].confirm}
          danger={DIALOGS[dialog].danger}
          cancel="Cancel"
          onCancel={() => setDialog(null)}
          onConfirm={confirmDialog}
        />
      )}
    </Screen>
  );
}

function Stat({
  icon,
  color,
  bg,
  label,
  value,
  sub,
  subColor,
}: {
  icon: IconName;
  color: string;
  bg: string;
  label: string;
  value: string;
  sub: string;
  subColor?: string;
}) {
  return (
    <View style={st.stat}>
      <IconTile icon={icon} color={color} bg={bg} size={32} />
      <Text style={st.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={T.tiny}>{label.toUpperCase()}</Text>
      <Text
        style={[
          st.statSub,
          subColor ? { color: subColor, fontWeight: "700" } : null,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {sub}
      </Text>
    </View>
  );
}

function Macro({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={st.macro}>
      <View style={[st.macroBar, { backgroundColor: color }]} />
      <Text style={st.macroVal}>
        {value}
        <Text style={st.macroUnit}>g</Text>
      </Text>
      <Text style={st.macroLabel}>{label}</Text>
    </View>
  );
}

/** Low-emphasis row for presenter controls; `danger` tints icon and title red. */
function DemoRow({
  icon,
  title,
  subtitle,
  danger,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const fg = danger ? C.danger : C.textSoft;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        st.demoRow,
        pressed && { backgroundColor: C.borderSoft },
      ]}
    >
      <IconTile
        icon={icon}
        color={fg}
        bg={danger ? C.dangerSoft : "#EEEDEB"}
        size={32}
        iconSize={16}
        radius={10}
      />
      <View style={{ flex: 1 }}>
        <Text style={[st.demoTitle, { color: danger ? C.danger : C.text }]}>
          {title}
        </Text>
        {!!subtitle && <Text style={T.tiny}>{subtitle}</Text>}
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 40 },
  hero: {
    borderRadius: R.xl,
    backgroundColor: C.card,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.borderSoft,
    ...shadowSm,
  },
  heroBg: { padding: 18, paddingBottom: 20, overflow: "hidden" },
  hello: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.72)" },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  name: {
    fontSize: 22,
    fontWeight: "900",
    color: C.white,
    letterSpacing: -0.5,
  },
  phone: { fontSize: 12.5, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 },
  stats: { flexDirection: "row", paddingVertical: 16, paddingHorizontal: 6 },
  quick: { flexDirection: "row", gap: 10, marginTop: 12 },
  quickTile: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: R.lg,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.borderSoft,
    ...shadowSm,
  },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: { fontSize: 12, fontWeight: "700", color: C.text },
  stat: { flex: 1, alignItems: "center", gap: 3, paddingHorizontal: 2 },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
    marginTop: 6,
  },
  statSub: { fontSize: 12, color: C.muted },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  budgetRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginTop: 4,
  },
  budget: {
    fontSize: 34,
    fontWeight: "800",
    color: C.primaryDark,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  budgetUnit: {
    fontSize: 14,
    color: C.textSoft,
    fontWeight: "600",
    marginBottom: 6,
  },
  macros: { flexDirection: "row", gap: 8, marginTop: 14 },
  macro: {
    flex: 1,
    backgroundColor: C.surfaceAlt,
    borderRadius: R.sm,
    padding: 10,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.borderSoft,
  },
  macroBar: { width: 18, height: 4, borderRadius: 2, marginBottom: 6 },
  macroVal: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    fontVariant: ["tabular-nums"],
  },
  macroUnit: { fontSize: 12, fontWeight: "600", color: C.muted },
  macroLabel: { fontSize: 11, color: C.muted, fontWeight: "600" },
  goalsLine: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  program: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    padding: 12,
    borderRadius: R.md,
    backgroundColor: C.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.borderSoft,
  },
  progIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  progTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  progMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 2,
    marginTop: 1,
  },
  streak: { flexDirection: "row", alignItems: "center", gap: 3 },
  streakText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.accent,
    fontVariant: ["tabular-nums"],
  },
  premium: {
    borderRadius: R.lg,
    paddingVertical: 20,
    paddingLeft: 20,
    paddingRight: 16,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  premEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  premEyebrowText: {
    color: C.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  premTitle: {
    color: C.white,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  premSub: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    marginTop: 3,
    fontWeight: "500",
  },
  premCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: C.white,
    borderRadius: R.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 14,
  },
  premCtaText: { color: C.navy, fontWeight: "700", fontSize: 12 },
  medalOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(245,196,81,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  medal: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingLeft: 52,
    paddingBottom: 12,
    marginTop: -4,
  },
  chipPill: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: C.border,
  },
  demoCard: {
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  demoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderRadius: R.sm,
  },
  demoTitle: { fontSize: 14, fontWeight: "600" },
  demoInset: { marginLeft: 48 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    paddingHorizontal: 12,
  },
  footerLogo: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: C.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    ...shadowSm,
  },
  footerText: { color: C.muted, fontSize: 12, flexShrink: 1 },
});
