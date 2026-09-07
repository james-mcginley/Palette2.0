import React, { useState, type ComponentType } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { RootStackParamList } from '@/navigation/types';
import { useCreateLog } from '@/lib/api/logs';
import { BookLogButton, FilmLogButton, TvLogButton, MusicLogButton, EventLogCard } from '@/components/logging';
import { StarRating } from '@/components/StarRating';
import { colors, radii, spacing, textStyles } from '@/theme/tokens';
import type { MediaType } from '@/lib/types/media';

type Props = NativeStackScreenProps<RootStackParamList, 'LogSheet'>;

interface LogButtonProps {
  children: React.ReactNode;
  onLogged?: () => void;
  disabled?: boolean;
  style?: any;
}

/**
 * The six ported components under components/logging/ are fully self-
 * contained (their own Reanimated shared values, haptics, and sound) — not
 * driven by mediaInteractions.ts's recipe config, which is a separate,
 * non-interoperating implementation of the same idea from elsewhere in the
 * design handoff. There's no dedicated podcast button, so CAST falls back to
 * MusicLogButton, matching the fallback mediaInteractions.ts itself uses.
 */
const LOG_BUTTON_BY_TYPE: Record<MediaType, ComponentType<LogButtonProps>> = {
  FILM: FilmLogButton,
  TV: TvLogButton,
  BOOK: BookLogButton,
  VINYL: MusicLogButton,
  CAST: MusicLogButton,
  EVENT: EventLogCard,
};

function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * The (+) quick-capture flow, collapsed to its essential shape: date, rating,
 * review, submit. The submit control is the real per-medium animated button
 * (shelf slide / ticket punch / dial click / needle drop / wax seal) rather
 * than a plain Pressable — see LOG_BUTTON_BY_TYPE above for why it doesn't
 * also call mediaInteractions.ts.
 */
export function LogSheetScreen({ route, navigation }: Props) {
  const { media } = route.params;
  const [rating, setRating] = useState<number>();
  const [review, setReview] = useState('');
  const [loggedOn, setLoggedOn] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const createLog = useCreateLog();

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setLoggedOn(selected);
  };

  /**
   * Deliberately not awaited: with the offline mutation queue (logs.ts), a
   * log fired while offline doesn't settle until reconnection, and the
   * whole point of that queue is that the UI doesn't wait around for it —
   * the optimistic update already landed in onMutate, so the screen can
   * close immediately. Awaiting mutateAsync here would block "go back" on
   * a network round trip that might not happen for hours.
   */
  const handleLogged = () => {
    createLog.mutate({
      media,
      rating,
      review: review || undefined,
      loggedOn: toDateOnlyString(loggedOn),
    });
    navigation.goBack();
  };

  const LogButton = LOG_BUTTON_BY_TYPE[media.mediaType];
  const isToday = toDateOnlyString(loggedOn) === toDateOnlyString(new Date());

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{media.title}</Text>

      <StarRating rating={rating} onChange={setRating} />

      <Pressable
        style={styles.dateRow}
        onPress={() => setShowDatePicker(true)}
        accessibilityRole="button"
        accessibilityLabel={`Logged on ${isToday ? 'today' : toDateOnlyString(loggedOn)}. Change date`}
      >
        <Text style={styles.dateLabel}>Logged on</Text>
        <Text style={styles.dateValue}>{isToday ? 'Today' : toDateOnlyString(loggedOn)}</Text>
      </Pressable>
      {showDatePicker && (
        <DateTimePicker value={loggedOn} mode="date" maximumDate={new Date()} onChange={handleDateChange} />
      )}

      <TextInput
        style={styles.review}
        placeholder="Write a review (optional)"
        placeholderTextColor={colors.textDim}
        value={review}
        onChangeText={setReview}
        multiline
      />

      <LogButton onLogged={handleLogged} disabled={createLog.isPending} style={styles.submitWrap}>
        <View style={styles.submit}>
          <Text style={styles.submitLabel}>{createLog.isPending ? 'Logging…' : 'Log it'}</Text>
        </View>
      </LogButton>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceCanvas, padding: spacing[5], gap: spacing[4] },
  title: { ...textStyles.headingLg, color: colors.textPrimary },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.md,
  },
  dateLabel: { ...textStyles.bodySm, color: colors.textSecondary },
  dateValue: { ...textStyles.bodyStrong, color: colors.textPrimary },
  review: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.md,
    padding: spacing[3],
    color: colors.textPrimary,
    textAlignVertical: 'top',
    ...textStyles.bodyMd,
  },
  submitWrap: { alignSelf: 'stretch' },
  submit: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  submitLabel: { ...textStyles.bodyStrong, color: colors.textOnAccent },
});
