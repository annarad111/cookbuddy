import { useReceipeStore } from "@/store/receipe-store";
import { StyleSheet, View, Text, FlatList, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { router } from "expo-router";

export default function HomeScreen() {
  const receipes = useReceipeStore((state) => state.receipes);
  console.log(receipes);

  return (
    <SafeAreaView style={styles.container}>
      {receipes.length !== 0 ? (
        <FlatList
          data={receipes}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/receipe/[id]",
                    params: { id: item.id },
                  })
                }
              >
                <Text style={styles.title}>{item.title}</Text>
              </Pressable>
            </View>
          )}
        />
      ) : (
        <View>
          <Text>You have no recipes yet, let's start creating them !</Text>
        </View>
      )}

      <Link href="/new-receipe" asChild>
        <Pressable style={styles.addButton}>
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDE2DD",
    justifyContent: "space-between",
    alignItems: "center",
  },
  card: {
    padding: 16,
    marginVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  titleInput: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 46,
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: "#FF8A65",
    paddingVertical: 1,
    paddingHorizontal: 16,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    position: 'absolute',
    bottom: '3%',
    right:'3%',
  },
});
