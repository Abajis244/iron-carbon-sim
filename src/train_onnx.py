import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

def train_and_export():
    # 1. Kinetics Model
    df_k = pd.read_csv("kinetics.csv")
    X_k = df_k[['C', 'Mn', 'Si', 'Cr', 'Ni', 'Mo']].astype('float32')
    y_k = df_k[['Log_Tau_Ferrite', 'Log_Tau_Pearlite', 'Log_Tau_Bainite']].astype('float32')
    
    model_k = RandomForestRegressor(n_estimators=40, max_depth=8, random_state=42)
    model_k.fit(X_k, y_k)
    onx_k = convert_sklearn(model_k, initial_types=[('float_input', FloatTensorType([None, 6]))], target_opset=12)
    if len(onx_k.graph.output) > 0 and len(onx_k.graph.output[0].type.tensor_type.shape.dim) > 1:
        onx_k.graph.output[0].type.tensor_type.shape.dim[1].dim_value = 3
    with open("steellab_kinetics_model.onnx", "wb") as f: f.write(onx_k.SerializeToString())

    # 2. Mechanics Model
    df_m = pd.read_csv("mechanics.csv")
    X_m = df_m[['C', 'Mn', 'Si', 'Cr', 'Ni', 'Mo', 'F_Ferrite', 'F_Pearlite', 'F_Bainite', 'F_Martensite']].astype('float32')
    y_m = df_m[['Yield_MPa', 'UTS_MPa', 'Hardness_HV', 'Elongation_Pct']].astype('float32')
    
    model_m = RandomForestRegressor(n_estimators=40, max_depth=8, random_state=42)
    model_m.fit(X_m, y_m)
    onx_m = convert_sklearn(model_m, initial_types=[('float_input', FloatTensorType([None, 10]))], target_opset=12)
    if len(onx_m.graph.output) > 0 and len(onx_m.graph.output[0].type.tensor_type.shape.dim) > 1:
        onx_m.graph.output[0].type.tensor_type.shape.dim[1].dim_value = 4
    with open("steellab_mechanical_model.onnx", "wb") as f: f.write(onx_m.SerializeToString())

if __name__ == "__main__":
    train_and_export()