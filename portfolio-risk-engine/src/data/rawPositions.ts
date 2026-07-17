/**
 * Verbatim contents of the two uploaded Charles Schwab
 * "Individual Positions" CSV exports (2026-07-16 07:49 PM ET).
 * The app parses these at startup to establish initial portfolio state;
 * drop-in replacement: paste newer exports here, or use the in-app
 * file-upload control which routes through the same parser.
 */
export const RAW_ACCOUNT_920 = `"Positions for account Individual ...920 as of 07:49 PM ET, 2026/07/16"

"Symbol","Description","Qty (Quantity)","Price","Price Chng $ (Price Change $)","Price Chng % (Price Change %)","Mkt Val (Market Value)","Day Chng $ (Day Change $)","Day Chng % (Day Change %)","Cost Basis","Gain $ (Gain/Loss $)","Gain % (Gain/Loss %)","Ratings","Reinvest?","Reinvest Capital Gains?","% of Acct (% of Account)","Asset Type",
"AMZN","AMAZON.COM INC","25","249.89","-5.07","-1.99%","$6,247.25","-$126.75","-1.99%","$3,226.00","$3,021.25","93.65%","D","No","N/A","2.07%","Equity",
"ASML","ASML HLDG N V FSPONSORED ADR 1 ADR REPS 1 ORD SHS","10","1,784.87","-30.40","-1.67%","$17,848.70","-$304.00","-1.67%","$7,032.60","$10,816.10","153.8%","-","No","N/A","5.93%","Equity",
"AXON","AXON ENTERPRISE INC","8","541.75","0.63","0.12%","$4,334.00","$5.04","0.12%","$3,479.52","$854.48","24.56%","F","No","N/A","1.44%","Equity",
"CDNS","CADENCE DESIGN SYS INC","12","364.65","-6.85","-1.84%","$4,375.80","-$82.20","-1.84%","$3,533.70","$842.10","23.83%","A","No","N/A","1.45%","Equity",
"CRWV","COREWEAVE INC CLASS A","27","72.91","-4.21","-5.46%","$1,968.57","-$113.67","-5.46%","$3,113.02","-$1,144.45","-36.76%","F","No","N/A","0.65%","Equity",
"IONQ","IONQ INC","72","35.10","-2.41","-6.42%","$2,527.20","-$173.52","-6.42%","$3,004.56","-$477.36","-15.89%","F","No","N/A","0.84%","Equity",
"NBIS","NEBIUS GROUP N V A FCLASS A","99","171.77","-27.74","-13.9%","$17,005.23","-$2,746.26","-13.9%","$5,518.26","$11,486.97","208.16%","-","No","N/A","5.65%","Equity",
"NOW","SERVICENOW INC","40","104.01","-0.72","-0.69%","$4,160.40","-$28.80","-0.69%","$4,107.60","$52.80","1.29%","C","No","N/A","1.38%","Equity",
"NVDA","NVIDIA CORP","255","207.40","-5.10","-2.4%","$52,887.00","-$1,300.50","-2.4%","$32,254.91","$20,632.09","63.97%","A","No","N/A","17.57%","Equity",
"IBIT","ISHARES BITCOIN TRUST ETF","210","36.39","-0.42","-1.14%","$7,641.90","-$88.20","-1.14%","$9,863.70","-$2,221.80","-22.53%","--","No","N/A","2.54%","ETFs & Closed End Funds",
"SMH","VANECK SEMICONDUCTOR ETF","87.7157","568.92","-21.85","-3.7%","$49,903.22","-$1,916.59","-3.7%","$14,816.13","$35,087.09","236.82%","--","Yes","N/A","16.57%","ETFs & Closed End Funds",
"SWPPX","SCHWAB S&P 500 INDEX","6,788.114","19.42","-0.10","-0.51%","$131,825.17","-$678.81","-0.51%","$45,746.09","$86,079.08","188.17%","4","Yes","Yes","43.78%","Mutual Fund",
"Cash & Cash Investments","--","--","--","--","--","$356.22","$0.01","0%","--","--","--","--","--","--","0.12%","Cash and Money Market",
"Positions Total","","--","--","--","--","$301,080.66","-$7,554.25","-2.51%","$135,696.09","$165,028.35","121.62%","--","--","--","--","--",`;

export const RAW_ACCOUNT_589 = `"Positions for account Individual ...589 as of 07:49 PM ET, 2026/07/16"

"Symbol","Description","Qty (Quantity)","Price","Price Chng $ (Price Change $)","Price Chng % (Price Change %)","Mkt Val (Market Value)","Day Chng $ (Day Change $)","Day Chng % (Day Change %)","Cost Basis","Gain $ (Gain/Loss $)","Gain % (Gain/Loss %)","Ratings","Reinvest?","Reinvest Capital Gains?","% of Acct (% of Account)","Asset Type",
"ASML","ASML HLDG N V FSPONSORED ADR 1 ADR REPS 1 ORD SHS","6","1,784.87","-30.40","-1.67%","$10,709.22","-$182.40","-1.67%","$4,464.12","$6,245.10","139.9%","-","No","N/A","22%","Equity",
"NBIS","NEBIUS GROUP N V A FCLASS A","59","171.77","-27.74","-13.9%","$10,134.43","-$1,636.66","-13.9%","$4,032.65","$6,101.78","151.31%","-","No","N/A","20.82%","Equity",
"NVDA","NVIDIA CORP","134.2035","207.40","-5.10","-2.4%","$27,833.81","-$684.44","-2.4%","$19,730.38","$8,103.43","41.07%","A","Yes","N/A","57.18%","Equity",
"Cash & Cash Investments","--","--","--","--","--","$0.01","$0.01","100%","--","--","--","--","--","--","0%","Cash and Money Market",
"Positions Total","","--","--","--","--","$48,677.47","-$2,503.49","-5.14%","$28,227.15","$20,450.31","72.45%","--","--","--","--","--",`;
