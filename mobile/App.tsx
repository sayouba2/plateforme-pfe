import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const etapes = [
  ['01', 'Trouver son stage', 'Préparez votre prochaine expérience professionnelle.'],
  ['02', 'Préparer sa convention', 'Construisez votre parcours avec votre entreprise et votre établissement.'],
  ['03', 'Avancer ensemble', 'Gardez le lien avec vos encadrants tout au long de votre stage.'],
] as const;

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.page}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.contenu}>
          <View style={styles.entete}>
            <Text style={styles.monogramme} accessible={false}>P</Text>
            <Text style={styles.marque}>Plateforme PFE</Text>
          </View>
          <Text style={styles.surtitre}>ESPACE ÉTUDIANT</Text>
          <Text style={styles.titre} accessibilityRole="header">
            Votre stage, un parcours accompagné.
          </Text>
          <Text style={styles.description}>
            De la première candidature à l’évaluation finale, un espace pour chaque étape de votre stage.
          </Text>
          <Text style={styles.information}>Votre espace est en préparation.</Text>
          <View style={styles.etapes}>
            {etapes.map(([numero, titre, description]) => (
              <View key={numero} style={styles.etape}>
                <Text style={styles.numero} accessible={false}>{numero}</Text>
                <Text style={styles.titreEtape} accessibilityRole="header">{titre}</Text>
                <Text style={styles.texteEtape}>{description}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.pied}>FST Marrakech · Stages et PFE</Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f7f8f4' },
  contenu: { padding: 24, maxWidth: 640, width: '100%', alignSelf: 'center' },
  entete: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 52 },
  monogramme: { backgroundColor: '#176653', color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', lineHeight: 40, width: 40, height: 40, borderRadius: 12, overflow: 'hidden' },
  marque: { fontSize: 18, fontWeight: '700', color: '#172d32' },
  surtitre: { color: '#176653', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginBottom: 20 },
  titre: { fontSize: 36, lineHeight: 42, fontWeight: '700', color: '#176653', letterSpacing: -1 },
  description: { fontSize: 17, lineHeight: 28, color: '#4a5c5b', marginTop: 22 },
  information: { fontSize: 14, lineHeight: 22, color: '#52665e', marginTop: 24 },
  etapes: { marginTop: 40, gap: 28 },
  etape: { borderTopWidth: 1, borderTopColor: '#d5dfd6', paddingTop: 22 },
  numero: { color: '#176653', fontSize: 13, fontWeight: '700' },
  titreEtape: { color: '#172d32', fontSize: 18, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  texteEtape: { color: '#4a5c5b', fontSize: 15, lineHeight: 24 },
  pied: { color: '#52665e', fontSize: 12, marginTop: 40, marginBottom: 12 },
});
