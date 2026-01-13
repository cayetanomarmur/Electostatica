import os
import json
import argparse

class ElectoralParser:
    def __init__(self, directory):
        self.directory = directory
        self.partidos = {}
        self.results = {
            'metadata': {},
            'candidacies': {},
            'municipalities': {},
            'provinces': {},
            'summary': {}
        }

    def get_party_info(self, file_path):
        """Parse 03xxaamm.DAT for party siglas and names."""
        if not os.path.exists(file_path): return
        with open(file_path, 'r', encoding='latin-1') as f:
            for line in f:
                if len(line) < 220: continue
                # FICHERO 03 Offsets
                # 9-14: Provincial code (Indices 8-14)
                cod_prov = line[8:14].strip()
                # 15-64: Siglas (Indices 14-64)
                siglas = line[14:64].strip()
                # 65-214: Name (Indices 64-214)
                nombre = line[64:214].strip()
                # 215-220: National code (Indices 214-220)
                cod_nacional = line[214:220].strip()
                
                # Store with provincial code
                self.partidos[cod_prov] = {"siglas": siglas, "name": nombre}
                self.results['candidacies'][cod_prov] = {"siglas": siglas, "name": nombre}
                
                # Also store with national code so summary lookups work
                if cod_nacional and cod_nacional != cod_prov:
                    if cod_nacional not in self.results['candidacies']:
                        self.results['candidacies'][cod_nacional] = {"siglas": siglas, "name": nombre}
                
                if not self.results['metadata']:
                    self.results['metadata'] = {
                        'type': line[0:2],
                        'year': line[2:6],
                        'month': line[6:8]
                    }

    def process_all(self):
        files = sorted(os.listdir(self.directory))  # Sort to ensure deterministic selection
        
        # 1. Load Parties
        f03 = next((f for f in files if f.startswith('03') and f.endswith('.DAT')), None)
        if f03:
            self.get_party_info(os.path.join(self.directory, f03))

        # 2. Process Provincial/National (08.DAT)
        f08 = next((f for f in files if f.startswith('08') and f.endswith('.DAT')), None)
        if f08:
            with open(os.path.join(self.directory, f08), 'r', encoding='latin-1') as f:
                for line in f:
                    # FICHERO 08 Offsets (Verified)
                    # Metadata (0-7), Vuelta (8)
                    # 10-11: CA (9-11), 12-13: Prov (11-13)
                    ca = line[9:11]
                    prov = line[11:13]
                    distrito = line[13:14] 
                    # 15-20: Cand (14-20)
                    cod_p = line[14:20].strip()
                    # 21-28: Votes (20-28)
                    votos = int(line[20:28].strip() or 0)
                    # 29-33: Seats (28-33)
                    escaños = int(line[28:33].strip() or 0)
                    
                    if ca == '99' and prov == '99':
                        self.results['summary'][cod_p] = {"votes": votos, "seats": escaños}
                    elif distrito == '9' and prov != '99':
                        if prov not in self.results['provinces']:
                            self.results['provinces'][prov] = {"votes": {}, "seats": {}}
                        self.results['provinces'][prov]['votes'][cod_p] = votos
                        self.results['provinces'][prov]['seats'][cod_p] = escaños

        # 2b. Extract Censo INE, blank votes, null votes from file 07 for participation
        f07 = next((f for f in files if f.startswith('07') and f.endswith('.DAT')), None)
        if f07:
            with open(os.path.join(self.directory, f07), 'r', encoding='latin-1') as f:
                for line in f:
                    line = line.strip()
                    if len(line) < 150: continue
                    # Look for national total (CA=99, Prov=99)
                    ca = line[9:11]
                    prov = line[11:13]
                    if ca == '99' and prov == '99':
                        try:
                            # According to FICHEROS.doc (1-indexed, so subtract 1):
                            # Pos 78-85: Censo del I.N.E. (8 digits)
                            # Pos 126-133: Votos en blanco (8 digits)
                            # Pos 134-141: Votos nulos (8 digits)
                            # Pos 142-149: Votos a candidaturas (8 digits)
                            censo = int(line[77:85].strip() or 0)
                            blancos = int(line[125:133].strip() or 0)
                            nulos = int(line[133:141].strip() or 0)
                            votos_cand = int(line[141:149].strip() or 0)
                            
                            self.results['metadata']['censo'] = censo
                            self.results['metadata']['blancos'] = blancos
                            self.results['metadata']['nulos'] = nulos
                            self.results['metadata']['total_votos'] = blancos + nulos + votos_cand
                        except:
                            pass
                        break

        # Ministry to INE CA Code Mapping
        MINIS_TO_INE = {
            '01': '01', '02': '02', '03': '03', '04': '04', '05': '05', '06': '06',
            '07': '08', '08': '07', '09': '09', '10': '11', '11': '12', '12': '13',
            '13': '15', '14': '16', '15': '14', '16': '17', '17': '10', '18': '18', '19': '19'
        }

        # 3. Process Municipal Names (05.DAT)
        f05 = next((f for f in files if f.startswith('05') and f.endswith('.DAT')), None)
        if f05:
            with open(os.path.join(self.directory, f05), 'r', encoding='latin-1') as f:
                for line in f:
                    # FICHERO 05 Offsets (Verified)
                    # 10-11: CA (9-11), 12-13: Prov (11-13), 14-16: Mun (13-16)
                    raw_ca = line[9:11]
                    ca = MINIS_TO_INE.get(raw_ca, raw_ca)
                    prov = line[11:13]
                    mun = line[13:16]
                    dist = line[16:18]
                    if dist != '99': continue 
                    
                    # 19-118: Name (18-118)
                    name = line[18:118].strip()
                    mun_id = f"{prov}{mun}"
                    
                    self.results['municipalities'][mun_id] = {
                        "name": name,
                        "ca": ca,
                        "prov": prov,
                        "votes": {},
                        "seats": 0
                    }
                    try:
                        self.results['municipalities'][mun_id]['seats'] = int(line[213:216].strip() or 0)
                    except: pass

        # 4. Process Municipal Votes (06.DAT)
        f06 = next((f for f in files if f.startswith('06') and f.endswith('.DAT')), None)
        if f06:
            with open(os.path.join(self.directory, f06), 'r', encoding='latin-1') as f:
                for line in f:
                    # FICHERO 06 Offsets (Verified)
                    # 10-11: Prov (9-11), 12-14: Mun (11-14), 15-16: Dist (14-16)
                    prov = line[9:11]
                    mun = line[11:14]
                    dist = line[14:16]
                    if dist != '99': continue
                    
                    # 17-22: Cand (16-22), 23-30: Votes (22-30)
                    cod_p = line[16:22].strip()
                    votos = int(line[22:30].strip() or 0)
                    
                    mun_id = f"{prov}{mun}"
                    if mun_id in self.results['municipalities']:
                        self.results['municipalities'][mun_id]['votes'][cod_p] = votos


        # Load municipality names mapping (extracted from GeoJSON)
        mun_names = {}
        names_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'municipality_names.json')
        if os.path.exists(names_file):
            try:
                with open(names_file, 'r', encoding='utf-8') as f:
                    mun_names = json.load(f)
            except: pass

        # 5. Process Open List Candidates (12.DAT)
        f12 = next((f for f in files if f.startswith('12') and f.endswith('.DAT')), None)
        if f12:
            print(f"Processing 12.DAT (Open Lists): {f12}")
            with open(os.path.join(self.directory, f12), 'r', encoding='latin-1') as f:
                for line in f:
                    prov = line[9:11]
                    mun = line[11:14]
                    mun_id = f"{prov}{mun}"
                    
                    party_code = line[14:20].strip()
                    
                    try:
                        # Votes are at the end, usually last 4 chars before 'S'/'N'
                        votos_str = line.strip()[-4:-1].strip()
                        votos = int(votos_str)
                    except:
                        continue

                    # Create Municipality if missing
                    if mun_id not in self.results['municipalities']:
                        self.results['municipalities'][mun_id] = {
                            "name": mun_names.get(mun_id, f"Municipio {mun_id}"),
                            "ca": "00", 
                            "prov": prov,
                            "votes": {},
                            "seats": 0
                        }
                    
                    if party_code not in self.results['municipalities'][mun_id]['votes']:
                        self.results['municipalities'][mun_id]['votes'][party_code] = 0
                    
                    self.results['municipalities'][mun_id]['votes'][party_code] += votos

    def calculate_alcaldias(self):
        """Calculate alcaldías (mayoralties) - count of municipalities won by each party."""
        # Build lookup from siglas to summary code (national codes)
        siglas_to_summary = {}
        for code in self.results['summary']:
            siglas = self.results['candidacies'].get(code, {}).get('siglas', '').upper().strip()
            if siglas and siglas not in siglas_to_summary:
                siglas_to_summary[siglas] = code
        
        alcaldias = {}
        
        for mun_id, mun in self.results.get('municipalities', {}).items():
            votes = mun.get('votes', {})
            if votes:
                # Winner is party with most votes in this municipality
                winner_code = max(votes.items(), key=lambda x: x[1])[0]
                # Get siglas for winner and map to national summary code
                winner_siglas = self.results['candidacies'].get(winner_code, {}).get('siglas', '').upper().strip()
                # Use the summary code if we can find it by siglas
                summary_code = siglas_to_summary.get(winner_siglas, winner_code)
                alcaldias[summary_code] = alcaldias.get(summary_code, 0) + 1
        
        # Add alcaldías to existing summary entries
        for party, count in alcaldias.items():
            if party in self.results['summary']:
                self.results['summary'][party]['alcaldias'] = count
        
        # Mark this as a municipales election
        if self.results.get('metadata'):
            self.results['metadata']['isMunicipales'] = True

    def save(self, output_path):
        # For municipales elections, calculate alcaldías
        if 'municipales' in output_path or self.results.get('metadata', {}).get('type') == '04':
            self.calculate_alcaldias()
        
        # Create pre-normalized summary for fast frontend comparison
        # Aggregate summary by canonical party names (PP, PSOE, etc.)
        normalized_summary = {}
        for code, data in self.results.get('summary', {}).items():
            siglas = self.results['candidacies'].get(code, {}).get('siglas', code).upper().strip()
            
            # Simple normalization: P.P. -> PP, P.S.O.E. -> PSOE, PSC -> PSOE
            canonical = siglas.replace('.', '').replace(' ', '')
            if canonical in ['PSC', 'PSEPSCAT', 'PSEPSOE', 'PSE']:
                canonical = 'PSOE'
            elif canonical in ['PP']:
                canonical = 'PP'
            elif canonical in ['VOX']:
                canonical = 'VOX'
            elif canonical in ['SUMAR', 'YOLANDADÍAZ']:
                canonical = 'SUMAR'
            elif canonical in ['PODEMOS', 'UPODEMOS', 'PODEMOSIU', 'ENCOMÚ', 'ENCOMÚPODEM']:
                canonical = 'PODEMOS'
            elif canonical in ['CS', 'CIUDADANOS', 'C\'S']:
                canonical = 'CS'
            elif canonical in ['ERC', 'ESQUERRA']:
                canonical = 'ERC'
            elif canonical in ['JUNTS', 'JXCAT', 'JUNTSPERCATALUNYA', 'CIU', 'CDC']:
                canonical = 'JUNTS'
            elif canonical in ['PNV', 'EAJPNV', 'EAJ']:
                canonical = 'PNV'
            elif canonical in ['BILDU', 'EHBILDU']:
                canonical = 'BILDU'
            elif canonical in ['IU', 'IZQUIERDAUNIDA']:
                canonical = 'IU'
            elif canonical in ['UPN', 'UNIÓNDELP UEBLONAV ARRO']:
                canonical = 'UPN'
            # Add to normalized summary
            if canonical not in normalized_summary:
                normalized_summary[canonical] = {'votes': 0, 'seats': 0}
                if 'alcaldias' in data:
                    normalized_summary[canonical]['alcaldias'] = 0
                    
            normalized_summary[canonical]['votes'] += data.get('votes', 0)
            normalized_summary[canonical]['seats'] += data.get('seats', 0)
            if 'alcaldias' in data:
                normalized_summary[canonical]['alcaldias'] = normalized_summary[canonical].get('alcaldias', 0) + data.get('alcaldias', 0)
        
        self.results['normalized_summary'] = normalized_summary
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('dir', help='Election data directory')
    parser.add_argument('output', help='Output JSON file')
    args = parser.parse_args()

    ep = ElectoralParser(args.dir)
    ep.process_all()
    ep.save(args.output)
    print(f"Successfully processed {args.dir} -> {args.output}")
