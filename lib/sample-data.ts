// Sample data for demo mode

export const sampleSalesData = `date,product,quantity,amount
2024-02-01,Rice 1kg,50,2500
2024-02-01,Wheat Flour 1kg,30,1200
2024-02-01,Sugar 1kg,20,800
2024-02-02,Rice 1kg,45,2250
2024-02-02,Cooking Oil 1L,25,3000
2024-02-03,Tea Powder 250g,40,1600
2024-02-03,Biscuits Pack,60,1800
2024-02-04,Rice 1kg,55,2750
2024-02-04,Wheat Flour 1kg,35,1400
2024-02-05,Sugar 1kg,15,600
2024-02-05,Cooking Oil 1L,20,2400
2024-02-06,Tea Powder 250g,50,2000
2024-02-06,Biscuits Pack,70,2100
2024-02-07,Rice 1kg,60,3000
2024-02-07,Detergent 1kg,10,500`;

export const sampleExpensesData = `date,category,amount,description
2024-02-01,rent,15000,Monthly shop rent
2024-02-01,utilities,2500,Electricity bill
2024-02-02,supplies,1200,Plastic bags and packaging
2024-02-03,wages,8000,Helper salary
2024-02-04,utilities,800,Water bill
2024-02-05,supplies,1500,Cleaning supplies
2024-02-06,maintenance,3000,Shop repairs
2024-02-07,transport,1000,Delivery charges`;

export const sampleInventoryData = `product,quantity,cost_price,selling_price
Rice 1kg,200,45,50
Wheat Flour 1kg,150,35,40
Sugar 1kg,100,38,40
Cooking Oil 1L,80,110,120
Tea Powder 250g,120,35,40
Biscuits Pack,200,25,30
Detergent 1kg,50,45,50
Salt 1kg,80,15,20
Soap Bar,100,20,25
Toothpaste,60,40,50`;

export function createSampleFile(data: string, filename: string): File {
  const blob = new Blob([data], { type: 'text/csv' });
  return new File([blob], filename, { type: 'text/csv' });
}
