import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

with open("myths.json", encoding="utf-8") as f:
    MYTHS = json.load(f)


def find_myth(question):
    best, best_score = None, 0
    for myth in MYTHS:
        score = sum(1 for k in myth["keywords"] if k in question)
        score += 2 * sum(1 for k in myth.get("strong", []) if k in question)
        if score > best_score:
            best, best_score = myth, score
    return best if best_score >= 2 else None


if __name__ == "__main__":
    # (question, expected id). None means the app should say it doesn't know.
    tests = [
        ("விரல்களை நெட்டி முறித்தால் மூட்டுவலி வருமா?", "knuckles"),
        ("சவரம் செய்தால் முடி அடர்த்தியாக வளருமா?", "shaving"),
        ("நாம் மூளையில் 10% மட்டுமே பயன்படுத்துகிறோமா?", "brain_ten_percent"),
        ("மின்னல் ஒரே இடத்தில் இரண்டு முறை தாக்காதா?", "lightning_twice"),
        ("குளிர் காற்றில் நனைந்தால்தான் சளி பிடிக்குமா?", "cold_causes_cold"),
        ("சர்க்கரை சாப்பிட்டால் குழந்தைகள் அதிகத் துறுதுறுப்பாகிறார்களா?", "sugar_hyperactive"),
        ("கோடையில் பூமி சூரியனுக்கு அருகில் வருவதால்தான் வெப்பமா?", "summer_closer_sun"),
        ("காளை சிவப்பு நிறத்தைப் பார்த்துதான் கோபப்படுமா?", "bull_red"),
        ("தங்கமீனுக்கு மூன்று வினாடி நினைவாற்றல்தானா?", "goldfish_memory"),
        ("நாக்கின் குறிப்பிட்ட பகுதிகள்தான் குறிப்பிட்ட சுவையை உணருமா?", "tongue_map"),
        ("மண்பானையில் தண்ணீர் ஏன் குளிர்ச்சியாக இருக்கிறது?", "clay_pot_cooling"),
        ("கூரை வீடு ஏன் குளிர்ச்சியாக இருக்கிறது?", "thatched_house"),
        ("தஞ்சாவூர் தலையாட்டி பொம்மை ஏன் தலையாட்டுகிறது?", "nodding_doll"),
        ("சென்னையில் ஏன் வெப்பமும் ஈரப்பதமும் அதிகம்?", "chennai_humid"),
        ("தமிழில் 'ழ' ஒலி ஏன் சிறப்பு வாய்ந்தது?", "zha_sound"),
        ("எழுதும் தமிழும் பேசும் தமிழும் ஏன் வேறுபடுகின்றன?", "written_vs_spoken"),
        ("தமிழில் 'நீ', 'நீங்கள்' என்று ஏன் இரண்டு வடிவங்கள்?", "nee_neengal"),
        ("ஆங்கிலத்தில் உள்ள தமிழ்ச் சொற்கள் எவை?", "english_words_from_tamil"),
        ("'யாதும் ஊரே யாவரும் கேளிர்' என்றால் என்ன பொருள்?", "yaadhum_oore"),
        ("அறுசுவை என்றால் என்ன?", "arusuvai"),
        ("கன்னியாகுமரி திருவள்ளுவர் சிலை ஏன் 133 அடி?", "valluvar_statue"),
        ("சங்க இலக்கியம் என்றால் என்ன?", "sangam_literature"),
        ("கர்நாடக இசை என்றால் என்ன?", "carnatic_music"),
        ("சேரர், சோழர், பாண்டியர் யார்?", "three_kingdoms"),
        ("ராஜராஜ சோழன் யார்?", "raja_raja_chola"),
        ("பல்லவர்கள் மகாபலிபுரத்தில் என்ன கட்டினார்கள்?", "mahabalipuram"),
        ("சோழர் காலச் செப்புச் சிலைகள் எப்படி வார்க்கப்பட்டன?", "chola_bronze"),
        ("நீலகிரி மலை ரயில் ஏன் சிறப்பு?", "nilgiri_railway"),
        ("ஆடிப்பெருக்கு ஏன் கொண்டாடப்படுகிறது?", "aadi_perukku"),
        ("மாட்டுப் பொங்கலில் மாடுகளை ஏன் கொண்டாடுகிறார்கள்?", "maattu_pongal"),
        # These two are not in the list, so the app should say it doesn't know.
        ("வானத்தில் எத்தனை நட்சத்திரம் உள்ளது?", None),
        ("இன்று வானிலை எப்படி இருக்கும்?", None),
    ]

    passed = 0
    for question, expected in tests:
        result = find_myth(question)
        got = result["id"] if result else None
        ok = got == expected
        passed += ok
        print("PASS" if ok else "FAIL", "|", question, "->", got)

    print()
    print(f"{passed} of {len(tests)} passed")
