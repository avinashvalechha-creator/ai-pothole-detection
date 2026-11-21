import sqlite3

def delete_all_water_hazards():
    print("Initiating Strict Waterbody Elimination Protocol...")
    conn = sqlite3.connect('pothole_intelligence.db')
    c = conn.cursor()

    water_clauses = [
        # --- BADLAPUR & ULHAS RIVER BASIN ---
        # The entire Ulhas River ribbon flowing through Badlapur / Kulgaon
        "(latitude BETWEEN 19.130 AND 19.180 AND longitude BETWEEN 73.224 AND 73.245)",
        # Katrap Lake & wetland
        "(latitude BETWEEN 19.143 AND 19.151 AND longitude BETWEEN 73.249 AND 73.256)",
        # Barvi Dam Reservoir
        "(latitude BETWEEN 19.160 AND 19.240 AND longitude BETWEEN 73.295 AND 73.385)",

        # --- MUMBAI / THANE / CREEKS ---
        "(latitude BETWEEN 18.980 AND 19.240 AND longitude BETWEEN 72.955 AND 73.025)", # Thane Creek
        "(latitude BETWEEN 19.280 AND 19.360 AND longitude BETWEEN 72.810 AND 72.980)", # Vasai Creek
        "(latitude BETWEEN 19.210 AND 19.255 AND longitude BETWEEN 73.070 AND 73.160)", # Ulhas River Kalyan/Dombivli
        "(latitude BETWEEN 18.960 AND 19.030 AND longitude BETWEEN 73.030 AND 73.110)", # Panvel Creek
        "(latitude BETWEEN 18.820 AND 18.900 AND longitude BETWEEN 73.080 AND 73.180)", # Patalganga River
        "(latitude BETWEEN 18.420 AND 18.460 AND longitude BETWEEN 73.100 AND 73.150)", # Kundalika River
        "(latitude BETWEEN 18.060 AND 18.110 AND longitude BETWEEN 73.400 AND 73.460)", # Savitri River
        "(latitude BETWEEN 17.510 AND 17.560 AND longitude BETWEEN 73.480 AND 73.540)", # Vashishti River

        # --- PUNE & MAHARASHTRA RESERVOIRS ---
        "(latitude BETWEEN 18.520 AND 18.560 AND longitude BETWEEN 73.840 AND 73.950)", # Mula-Mutha River
        "(latitude BETWEEN 18.420 AND 18.460 AND longitude BETWEEN 73.740 AND 73.790)", # Khadakwasla Dam
        "(latitude BETWEEN 18.660 AND 18.720 AND longitude BETWEEN 73.460 AND 73.550)", # Pawna Lake
        "(latitude BETWEEN 17.350 AND 17.750 AND longitude BETWEEN 73.680 AND 73.820)", # Koyna Reservoir
        "(latitude BETWEEN 18.020 AND 18.150 AND longitude BETWEEN 75.100 AND 75.250)", # Ujani Reservoir
        "(latitude BETWEEN 19.450 AND 19.550 AND longitude BETWEEN 75.320 AND 75.450)", # Jayakwadi Reservoir
        "(latitude BETWEEN 19.980 AND 20.020 AND longitude BETWEEN 73.760 AND 73.820)", # Godavari Nashik

        # --- GUJARAT RIVERS & WATERBODIES ---
        "(latitude BETWEEN 22.970 AND 23.100 AND longitude BETWEEN 72.555 AND 72.595)", # Sabarmati Ahmedabad
        "(latitude BETWEEN 21.150 AND 21.240 AND longitude BETWEEN 72.750 AND 72.860)", # Tapi Surat
        "(latitude BETWEEN 21.660 AND 21.740 AND longitude BETWEEN 72.920 AND 73.050)", # Narmada Bharuch
        "(latitude BETWEEN 21.000 AND 22.250 AND longitude BETWEEN 72.150 AND 72.750)", # Gulf of Khambhat

        # --- DELHI / NCR RIVERS ---
        "(latitude BETWEEN 28.520 AND 28.760 AND longitude BETWEEN 77.225 AND 77.285)", # Yamuna Delhi
        "(latitude BETWEEN 27.150 AND 27.230 AND longitude BETWEEN 78.010 AND 78.080)", # Yamuna Agra
        "(latitude BETWEEN 27.470 AND 27.540 AND longitude BETWEEN 77.670 AND 77.730)", # Yamuna Mathura

        # --- GANGA BASIN (UP & BIHAR) ---
        "(latitude BETWEEN 25.250 AND 25.360 AND longitude BETWEEN 82.990 AND 83.070)", # Ganga Varanasi
        "(latitude BETWEEN 25.400 AND 25.470 AND longitude BETWEEN 81.850 AND 81.940)", # Sangam Prayagraj
        "(latitude BETWEEN 26.460 AND 26.550 AND longitude BETWEEN 80.310 AND 80.430)", # Ganga Kanpur
        "(latitude BETWEEN 25.590 AND 25.680 AND longitude BETWEEN 85.070 AND 85.310)", # Ganga Patna

        # --- WEST BENGAL & ODISHA ---
        "(latitude BETWEEN 22.490 AND 22.660 AND longitude BETWEEN 88.315 AND 88.375)", # Hooghly Kolkata
        "(latitude BETWEEN 20.430 AND 20.530 AND longitude BETWEEN 85.790 AND 85.960)", # Mahanadi Cuttack
        "(latitude BETWEEN 19.400 AND 19.950 AND longitude BETWEEN 85.050 AND 85.650)", # Chilika Lake

        # --- SOUTH INDIA ---
        "(latitude BETWEEN 16.470 AND 16.540 AND longitude BETWEEN 80.570 AND 80.670)", # Krishna Vijayawada
        "(latitude BETWEEN 16.970 AND 17.050 AND longitude BETWEEN 81.730 AND 81.830)", # Godavari Rajahmundry
        "(latitude BETWEEN 10.810 AND 10.890 AND longitude BETWEEN 78.660 AND 78.750)", # Kaveri Trichy
        "(latitude BETWEEN 9.400 AND 10.100 AND longitude BETWEEN 76.220 AND 76.360)",  # Vembanad Lake Kochi
        "(latitude BETWEEN 13.350 AND 13.800 AND longitude BETWEEN 80.120 AND 80.380)", # Pulicat Lake
        "(latitude BETWEEN 17.400 AND 17.450 AND longitude BETWEEN 78.450 AND 78.500)", # Hussain Sagar
        "(latitude BETWEEN 17.290 AND 17.410 AND longitude BETWEEN 78.250 AND 78.370)", # Osman Sagar
        "(latitude BETWEEN 16.500 AND 16.650 AND longitude BETWEEN 79.250 AND 79.400)", # Nagarjuna Sagar
        "(latitude BETWEEN 16.050 AND 16.150 AND longitude BETWEEN 78.850 AND 78.950)", # Srisailam
        "(latitude < 8.088)", # Indian Ocean below Kanyakumari

        # --- NORTH & NORTH-EAST ---
        "(latitude BETWEEN 34.060 AND 34.160 AND longitude BETWEEN 74.820 AND 74.910)", # Dal Lake Srinagar
        "(latitude BETWEEN 34.290 AND 34.430 AND longitude BETWEEN 74.490 AND 74.660)", # Wular Lake
        "(latitude BETWEEN 26.150 AND 26.230 AND longitude BETWEEN 91.670 AND 91.830)", # Brahmaputra Guwahati
        "(latitude BETWEEN 26.590 AND 26.670 AND longitude BETWEEN 92.750 AND 92.860)", # Brahmaputra Tezpur
        "(latitude BETWEEN 27.460 AND 27.550 AND longitude BETWEEN 94.870 AND 94.970)", # Brahmaputra Dibrugarh
        "(latitude BETWEEN 23.220 AND 23.290 AND longitude BETWEEN 77.290 AND 77.410)", # Upper Lake Bhopal
        "(latitude BETWEEN 24.550 AND 24.630 AND longitude BETWEEN 73.650 AND 73.710)", # Lake Pichola Udaipur
        "(latitude BETWEEN 24.480 AND 24.670 AND longitude BETWEEN 93.740 AND 93.920)", # Loktak Lake
        "(latitude BETWEEN 26.800 AND 27.100 AND longitude BETWEEN 74.850 AND 75.300)", # Sambhar Salt Lake
        "(latitude BETWEEN 21.500 AND 21.650 AND longitude BETWEEN 83.750 AND 83.950)", # Hirakud Reservoir
    ]

    where_clause = " OR ".join(water_clauses)

    # 1. Select hazard IDs to delete
    c.execute(f"SELECT id FROM road_hazards WHERE {where_clause}")
    ids_to_delete = [row[0] for row in c.fetchall()]
    print(f"Found {len(ids_to_delete)} hazards sitting inside lakes, rivers, and water bodies across India.")

    if ids_to_delete:
        # Delete observations first (foreign key)
        c.execute(f"DELETE FROM observations WHERE hazard_id IN (SELECT id FROM road_hazards WHERE {where_clause})")
        # Delete hazards
        c.execute(f"DELETE FROM road_hazards WHERE {where_clause}")
        conn.commit()

    # Now, check remaining count
    c.execute("SELECT count(*) FROM road_hazards")
    total_remaining = c.fetchone()[0]

    # Verify zero in water
    c.execute(f"SELECT count(*) FROM road_hazards WHERE {where_clause}")
    in_water_now = c.fetchone()[0]

    print(f"COMPLETE! Successfully purged all water hazards.")
    print(f"Verified Active Road Hazards Remaining: {total_remaining}")
    print(f"Hazards inside water bodies now: {in_water_now}")

    conn.close()

if __name__ == '__main__':
    delete_all_water_hazards()
