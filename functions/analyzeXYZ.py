import math
import pandas as pd
import logging
from functions.deleteDifCol import prune_columns

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

def calculate_stddev(values):
    mean_value = sum(values) / len(values)
    variance = sum((x - mean_value) ** 2 for x in values) / len(values)
    return math.sqrt(variance)

def analyzeXYZ_data(data, thresholdX, thresholdY, thresholdZ, start_col, end_col):
    data_new = prune_columns(data, start_col, end_col)

    table_data = data_new['data']
    columns = data_new['columns']

    # Найти индексы указанных столбцов
    start_idx = columns.index(start_col)
    end_idx = columns.index(end_col) + 1

    # Вычислить сумму указанного диапазона столбцов для каждого ученика
    measure_data = []
    for row in table_data:
        student = row[1]
        values = [float(row[i]) if row[i] != '' else 0.0 for i in range(start_idx, end_idx)]
        if values:  # Убедиться, что список не пуст
            mean_value = sum(values) / len(values)
            stddev_value = calculate_stddev(values)
            ratio_variation = stddev_value / mean_value * 100 if mean_value != 0 else 0
            analysis_measure = sum(values)
        else:
            mean_value = 0
            stddev_value = 0
            ratio_variation = 0
        measure_data.append((student, values, analysis_measure, ratio_variation, mean_value))

    # Отсортировать данные на основе коэффициента вариации
    measure_data.sort(key=lambda x: x[2], reverse=True)

    result = []

    for i, (student, all_values, value, ratio_variation, mean_value) in enumerate(measure_data):

        if ratio_variation <= thresholdX:
            category = 'X'
        elif ratio_variation <= (thresholdX + thresholdY):
            category = 'Y'
        else:
            category = 'Z'

        ration_var = '{:.2f}%'.format(ratio_variation)

        period_dict = {col_name: val for col_name, val in zip(columns[start_idx:end_idx], all_values)}

        result.append({
            '№': i + 1,
            'Ученики': student,
            'Анализируемый период': value,
            'Коэффициент вариации': ration_var,
            'Категория': category,
            'period': period_dict,
            'avg': mean_value
        })

    df_result = pd.DataFrame(result)

    return df_result.to_dict(orient='records')