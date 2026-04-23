import React from 'react';
import { View, Image, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius, Typography } from '../constants/theme';

interface Props {
  value: string;
  size?: number;
  /** Shown below the QR code */
  label?: string;
}

/**
 * Renders a QR code image for the given value.
 * Uses the qrserver.com API to generate the QR image.
 * Falls back to a text display if the image fails to load.
 */
export function QRCode({ value, size = 200, label }: Props) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const uri = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&format=png&margin=1`;

  return (
    <View style={styles.container} accessibilityLabel={`QR code for ${label ?? value}`}>
      {loading && !error && (
        <View style={[styles.placeholder, { width: size, height: size }]}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}
      {!error ? (
        <Image
          source={{ uri }}
          style={[styles.image, { width: size, height: size }, loading && styles.hidden]}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.fallback, { width: size, height: size }]}>
          <Text style={styles.fallbackText} numberOfLines={4}>{value}</Text>
        </View>
      )}
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  placeholder: {
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { borderRadius: BorderRadius.md },
  hidden: { position: 'absolute', opacity: 0 },
  fallback: {
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface[100],
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  fallbackText: { ...Typography.caption, color: Colors.surface[600], textAlign: 'center', fontFamily: 'monospace' },
  label: { ...Typography.caption, color: Colors.surface[500] },
});
