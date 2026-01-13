import os
import json
import argparse
from parser import ElectoralParser

def batch_process(base_dir, output_dir):
    print(f"Scanning {base_dir}...")
    
    # We look for specific patterns or just walk
    # Structure seems to be Category/02yyyymm/...
    
    tasks = []

    for root, dirs, files in os.walk(base_dir):
        # Check if this directory contains a 03*.DAT file (Parties) or 08*.DAT (Results), 
        # indicating it's an election folder.
        has_dat = any(f.endswith('.DAT') for f in files)
        if has_dat:
            tasks.append(root)

    print(f"Found {len(tasks)} election directories.")
    
    os.makedirs(output_dir, exist_ok=True)

    for election_dir in tasks:
        try:
            # Determine output filename
            # parent folder name should be the ID e.g. 04202305
            folder_name = os.path.basename(election_dir)
            
            # If folder_name is like '04202305', we can parse it
            # But let's rely on parser metadata if possible, or just use folder name mapping if needed.
            # parser.py saves based on type/year/month logic? 
            # No, parser.py took an 'output' argument.
            
            # Let's peek at the directory name to guess type/year/month for filename
            # Convention: 02yyyymm (Congreso), 04yyyymm (Municipales?) -> Check file logs
            # Actually we can just parse it and see what the metadata says
            
            print(f"Processing {election_dir}...")
            ep = ElectoralParser(election_dir)
            ep.process_all()
            
            meta = ep.results.get('metadata', {})
            if not meta:
                print(f"WARNING: No metadata found for {election_dir}, skipping.")
                continue

            # Type 02 = Congreso, 04 = Municipales?
            etype = meta.get('type')
            eyear = meta.get('year')
            emonth = meta.get('month')
            
            if not (etype and eyear and emonth):
                print(f"WARNING: Incomplete metadata for {election_dir}")
                continue
                
            type_str = "congreso" if etype == '02' else "municipales"
            filename = f"{type_str}_{eyear}_{emonth}.json"
            output_path = os.path.join(output_dir, filename)
            
            ep.save(output_path)
            print(f"Saved to {output_path}")

        except Exception as e:
            print(f"ERROR processing {election_dir}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', default='Data', help='Base Data directory')
    parser.add_argument('--out', default='Data/processed', help='Output processed directory')
    args = parser.parse_args()
    
    batch_process(args.data, args.out)
