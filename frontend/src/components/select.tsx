import { useState } from "react";
import { View, Modal, Pressable, FlatList } from "react-native";
import { CaretDown, Check } from "phosphor-react-native";
import { AppText } from "@/src/components/ui";
import { makeStyles, spacing, radius, useTheme, fonts, fontSize } from "@/src/theme";

export type Option = { value: string; label: string; sublabel?: string };

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
  testID,
}: {
  label?: string;
  value?: string | null;
  options: Option[];
  onChange: (v: string) => void;
  placeholder?: string;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      {label ? <AppText variant="label" style={styles.label}>{label}</AppText> : null}
      <Pressable testID={testID} style={styles.control} onPress={() => setOpen(true)}>
        <AppText variant="body" color={selected ? "onSurface" : "muted"} numberOfLines={1} style={{ flex: 1 }}>
          {selected ? selected.label : placeholder}
        </AppText>
        <CaretDown size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {label ? <AppText variant="heading" style={styles.sheetTitle}>{label}</AppText> : null}
            <FlatList
              data={options}
              keyExtractor={(o) => o.value}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <Pressable
                  testID={`option-${item.value}`}
                  style={styles.option}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="body">{item.label}</AppText>
                    {item.sublabel ? <AppText variant="caption">{item.sublabel}</AppText> : null}
                  </View>
                  {item.value === value ? <Check size={18} color={colors.success} weight="bold" /> : null}
                </Pressable>
              )}
              ListEmptyComponent={<AppText variant="caption" style={{ padding: spacing.lg }}>No options available</AppText>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: spacing.xs },
  label: { color: colors.onSurfaceSecondary, fontSize: fontSize.sm, fontFamily: fonts.bodySemibold },
  control: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(6,27,58,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing["2xl"],
  },
  sheetTitle: { marginBottom: spacing.md },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
}));
