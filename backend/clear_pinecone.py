import argparse
import os

from pinecone import Pinecone


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Delete ALL vectors from a Pinecone index (optionally within a namespace)."
    )
    parser.add_argument(
        "--namespace",
        default=None,
        help="Namespace to clear (default: clears the default namespace).",
    )
    args = parser.parse_args()

    api_key = os.getenv("PINECONE_API_KEY", "pcsk_4qWRak_DzzxW1rqKa9HpBJQFjtmaTLsw7uTScZEZLcfbxNGpWvsa8b4hbZutYf6viLyD7u")
    index_name = os.getenv("PINECONE_INDEX_NAME", "cogni-embeddings")

    if not api_key:
        raise SystemExit("Missing PINECONE_API_KEY in environment.")

    pc = Pinecone(api_key=api_key)
    index = pc.Index(index_name)

    # DANGER: This irreversibly deletes data.
    # Pinecone Python client supports delete_all via delete_all=True in v3+.
    if args.namespace is None:
        index.delete(delete_all=True)
        print(f"Cleared ALL vectors in index '{index_name}' (default namespace).")
    else:
        index.delete(delete_all=True, namespace=args.namespace)
        print(f"Cleared ALL vectors in index '{index_name}' (namespace='{args.namespace}').")


if __name__ == "__main__":
    main()

