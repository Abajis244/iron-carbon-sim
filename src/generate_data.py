import pandas as pd
import numpy as np
import random

def generate_datasets(num_samples=10000):
    kinetics_data, mechanics_data = [], []
    for _ in range(num_samples):
        c, mn, si = [round(random.uniform(0.1, 1.5), 3) for _ in range(3)]
        cr, ni, mo = [round(random.uniform(0.0, 5.0), 3) for _ in range(3)]
        
        # Kinetics approximations
        kinetics_data.append({"C": c, "Mn": mn, "Si": si, "Cr": cr, "Ni": ni, "Mo": mo, 
                              "Log_Tau_Ferrite": c*2, "Log_Tau_Pearlite": mn*2, "Log_Tau_Bainite": cr*2})
        
        # Mechanics approximations
        ys = 250 + (c * 500) + (mn * 100)
        uts = ys * 1.2
        hv = ys / 3.3
        elong = max(2, 30 - (c * 15))
        mechanics_data.append({"C": c, "Mn": mn, "Si": si, "Cr": cr, "Ni": ni, "Mo": mo,
                               "F_Ferrite": 0.4, "F_Pearlite": 0.4, "F_Bainite": 0.1, "F_Martensite": 0.1,
                               "Yield_MPa": ys, "UTS_MPa": uts, "Hardness_HV": hv, "Elongation_Pct": elong})
                               
    pd.DataFrame(kinetics_data).to_csv("kinetics.csv", index=False)
    pd.DataFrame(mechanics_data).to_csv("mechanics.csv", index=False)

if __name__ == "__main__":
    generate_datasets()